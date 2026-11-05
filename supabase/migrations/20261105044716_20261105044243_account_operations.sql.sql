-- Account operations. No source configuration, credentials, or admin assignments.
create table public.support_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('support','privacy','deletion')), message text not null check(length(btrim(message)) between 1 and 2000),
 status text not null default 'open' check(status in ('open','in_review','resolved')), created_at timestamptz not null default now()
);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon,authenticated;
grant select,insert on public.support_requests to authenticated;
grant update(status) on public.support_requests to authenticated;
create policy support_read on public.support_requests for select to authenticated using(user_id=(select auth.uid()) or private.is_admin());
create policy support_create on public.support_requests for insert to authenticated with check(user_id=(select auth.uid()) and status='open');
create policy support_review on public.support_requests for update to authenticated using(private.is_admin()) with check(private.is_admin());
create index support_owner on public.support_requests(user_id,created_at desc);
create table public.notifications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 alert_id uuid references public.price_alerts(id) on delete cascade,offer_id uuid references public.store_offers(id) on delete cascade,
 observed_at timestamptz not null,title text not null,body text not null,read_at timestamptz,created_at timestamptz not null default now(),
 unique(alert_id,offer_id,observed_at)
);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon,authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
create policy notification_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notification_mark on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create index notification_owner on public.notifications(user_id,created_at desc);
-- Trigger-only function, not callable through the Data API. Only eligible standard prices generate notices.
create function private.notify_price_target() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status<>'active' or new.currency<>'CAD' or new.member_only or new.observed_at>now() or new.observed_at<=now()-interval '48 hours' or (new.valid_until is not null and new.valid_until<=now()) or coalesce(new.sale_price,new.regular_price) is null then return new; end if;
 insert into public.notifications(user_id,alert_id,offer_id,observed_at,title,body)
 select a.user_id,a.id,new.id,new.observed_at,'Price target reached',p.name||' — '||v.name||' is CAD '||coalesce(new.sale_price,new.regular_price)::text||' at '||s.name||'. Check current availability before shopping.'
 from public.retailer_products rp join public.product_variants v on v.id=rp.variant_id join public.products p on p.id=v.product_id
 join public.price_alerts a on a.variant_id=v.id and a.active and a.target_price>=coalesce(new.sale_price,new.regular_price)
 join public.retailer_stores s on s.id=new.store_id and s.active join public.retailers r on r.id=s.retailer_id and r.status='active' and r.id=rp.retailer_id
 where rp.id=new.retailer_product_id and private.source_is_public(rp.source_id)
 on conflict(alert_id,offer_id,observed_at) do nothing;
 return new;
end $$;
revoke all on function private.notify_price_target() from public,anon,authenticated;
create trigger offer_target_notice after insert or update on public.store_offers for each row execute function private.notify_price_target();
create table public.commercial_links (
 id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id) on delete cascade,
 label text not null check(length(btrim(label)) between 1 and 160),url text not null check(url ~ '^https://[^[:space:]]+$'),
 relationship text not null default 'standard' check(relationship in ('standard','affiliate','sponsored')),enabled boolean not null default false,created_at timestamptz not null default now()
);
alter table public.commercial_links enable row level security;
revoke all on public.commercial_links from anon,authenticated;
grant select on public.commercial_links to anon,authenticated;
grant insert,update,delete on public.commercial_links to authenticated;
create policy link_read on public.commercial_links for select to anon,authenticated using(enabled or private.is_admin());
create policy link_admin on public.commercial_links for all to authenticated using(private.is_admin()) with check(private.is_admin());
create index link_product on public.commercial_links(product_id);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(),actor_id uuid,table_name text not null,action text not null,record_id text,created_at timestamptz not null default now()
);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon,authenticated;
grant select on public.audit_events to authenticated;
create policy audit_admin_read on public.audit_events for select to authenticated using(private.is_admin());
create index audit_time on public.audit_events(created_at desc);
create function private.audit_catalog_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_events(actor_id,table_name,action,record_id) values(auth.uid(),tg_table_name,tg_op,case when tg_op='DELETE' then old.id::text else new.id::text end);
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.audit_catalog_change() from public,anon,authenticated;
do $$ declare t text; begin foreach t in array array['products','product_variants','product_images','commercial_links','retailers','retailer_stores'] loop execute format('create trigger catalog_audit after insert or update or delete on public.%I for each row execute function private.audit_catalog_change()',t); end loop; end $$;
create function public.duplicate_shopping_list(p_list uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare original public.shopping_lists; new_id uuid;
begin
 select * into original from public.shopping_lists where id=p_list and user_id=auth.uid();
 if not found then raise exception 'Shopping list not found'; end if;
 insert into public.shopping_lists(user_id,name) values(auth.uid(),left(original.name||' (copy)',80)) returning id into new_id;
 insert into public.shopping_list_items(list_id,variant_id,label,quantity,checked) select new_id,variant_id,label,quantity,false from public.shopping_list_items where list_id=p_list;
 return new_id;
end $$;
revoke all on function public.duplicate_shopping_list(uuid) from public,anon;
grant execute on function public.duplicate_shopping_list(uuid) to authenticated;
grant all on public.support_requests,public.notifications,public.commercial_links,public.audit_events to service_role;
-- Atomic normalized ingestion endpoint. Only server-side service_role can call it.
-- Retailer adapters and scheduling remain disabled until sources are configured.
create function public.ingest_offer_batch(p_source uuid,p_rows jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare source public.data_sources; item jsonb; job uuid; rp public.retailer_products; v_store uuid; observed timestamptz; expires timestamptz; regular numeric; sale numeric; n integer;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 then raise exception 'A batch must contain 1–1000 offers'; end if;
 select * into source from public.data_sources where id=p_source for share;
 if not found or source.authorization_status<>'authorized' or not source.allowed_redistribution or (source.license_expires_at is not null and source.license_expires_at<=now()) then raise exception 'Source is not authorized for redistribution'; end if;
 if not exists(select 1 from public.retailers where id=source.retailer_id and status='active') then raise exception 'Retailer is inactive'; end if;
 n=jsonb_array_length(p_rows);
 insert into public.import_jobs(source_id,status,started_at,received) values(p_source,'running',now(),n) returning id into job;
 for item in select value from jsonb_array_elements(p_rows) loop
  select * into rp from public.retailer_products where source_id=p_source and external_id=item->>'external_id';
  if not found or rp.variant_id is null or rp.retailer_id<>source.retailer_id then raise exception 'Unmatched source product'; end if;
  v_store=(item->>'store_id')::uuid;
  if not exists(select 1 from public.retailer_stores s where s.id=v_store and s.retailer_id=source.retailer_id and s.active) then raise exception 'Store does not belong to active retailer'; end if;
  observed=(item->>'observed_at')::timestamptz; expires=nullif(item->>'valid_until','')::timestamptz;
  regular=nullif(item->>'regular_price','')::numeric; sale=nullif(item->>'sale_price','')::numeric;
  if coalesce(item->>'currency','')<>'CAD' or observed is null or observed>now() or observed<=now()-interval '48 hours' or (expires is not null and expires<=now()) or coalesce(sale,regular) is null or regular<0 or sale<0 or regular>999999999 or sale>999999999 or regular::text in ('NaN','Infinity','-Infinity') or sale::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid, expired or non-CAD offer'; end if;
  insert into public.store_offers(retailer_product_id,store_id,regular_price,sale_price,currency,observed_at,valid_until,member_only,status)
  values(rp.id,v_store,regular,sale,'CAD',observed,expires,coalesce((item->>'member_only')::boolean,false),'active')
  on conflict(retailer_product_id,store_id) do update set regular_price=excluded.regular_price,sale_price=excluded.sale_price,currency=excluded.currency,observed_at=excluded.observed_at,valid_until=excluded.valid_until,member_only=excluded.member_only,status='active'
  where public.store_offers.observed_at<=excluded.observed_at;
  insert into public.price_history(retailer_product_id,store_id,source_id,import_job_id,regular_price,sale_price,currency,observed_at)
  select rp.id,v_store,p_source,job,regular,sale,'CAD',observed where not exists(select 1 from public.price_history h where h.retailer_product_id=rp.id and h.store_id=v_store and h.observed_at=observed);
  update public.retailer_products set last_seen_at=greatest(last_seen_at,observed) where id=rp.id;
 end loop;
 update public.import_jobs set status='completed',finished_at=now(),accepted=n where id=job;
 update public.data_sources set last_success_at=now() where id=p_source;
 return job;
end $$;
revoke all on function public.ingest_offer_batch(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_offer_batch(uuid,jsonb) to service_role;
