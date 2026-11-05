-- Application permissions and storage. No retailer sources or offers are seeded.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table if not exists private.admin_users(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table private.admin_users enable row level security;
revoke all on private.admin_users from public,anon,authenticated;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from private.admin_users where user_id=auth.uid())$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon,authenticated;
create or replace function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$select private.is_admin()$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;
-- Safe boolean lookup prevents RLS predicates from requiring public source/license access.
create or replace function private.source_is_public(p_source uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.data_sources d join public.retailers r on r.id=d.retailer_id where d.id=p_source and r.status='active' and d.authorization_status='authorized' and d.allowed_redistribution and (d.license_expires_at is null or d.license_expires_at>now()))$$;
revoke all on function private.source_is_public(uuid) from public;
grant execute on function private.source_is_public(uuid) to anon,authenticated;
drop policy if exists public_retailer_products_read on public.retailer_products;
create policy public_retailer_products_read on public.retailer_products for select to anon,authenticated using(private.source_is_public(source_id));
drop policy if exists public_offers_read on public.store_offers;
create policy public_offers_read on public.store_offers for select to anon,authenticated using(status='active' and currency='CAD' and observed_at<=now() and observed_at>now()-interval '48 hours' and (valid_until is null or valid_until>now()) and exists(select 1 from public.retailer_products rp join public.retailer_stores s on s.id=store_offers.store_id where rp.id=store_offers.retailer_product_id and s.active and s.retailer_id=rp.retailer_id and private.source_is_public(rp.source_id)));
alter table public.shopping_list_items add column if not exists checked boolean not null default false;
create table if not exists public.product_images(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id) on delete cascade,path text not null,url text not null,sort_order integer not null default 0,created_at timestamptz not null default now());
alter table public.product_images enable row level security;
grant select on public.product_images to anon,authenticated;
grant all on public.product_images to service_role;
create policy public_product_images on public.product_images for select to anon,authenticated using(true);
-- Admin checks are in database policies, never in user-editable auth metadata.
do $$declare t text;begin foreach t in array array['retailers','retailer_stores','categories','brands','products','product_variants','product_identifiers','retailer_products','product_images'] loop
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy admin_access on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t);
end loop;end$$;
-- Sources, import logs and offer writes stay server-controlled. Admin may inspect them.
grant select on public.data_sources,public.import_jobs,public.price_history to authenticated;
create policy admin_sources_read on public.data_sources for select to authenticated using((select private.is_admin()));
create policy admin_jobs_read on public.import_jobs for select to authenticated using((select private.is_admin()));
create policy history_public_read on public.price_history for select to anon,authenticated using(private.source_is_public(source_id));
grant select on public.price_history to anon;
create or replace function public.product_price_history(p_variant uuid,p_store uuid default null) returns table(observed_at timestamptz,store_name text,regular_price numeric,sale_price numeric) language sql stable security invoker set search_path='' as $$select h.observed_at,s.name,h.regular_price,h.sale_price from public.price_history h join public.retailer_products rp on rp.id=h.retailer_product_id join public.retailer_stores s on s.id=h.store_id where rp.variant_id=p_variant and (p_store is null or h.store_id=p_store) and h.currency='CAD' and coalesce(h.sale_price,h.regular_price)>=0 order by h.observed_at desc limit 90$$;
revoke all on function public.product_price_history(uuid,uuid) from public;
grant execute on function public.product_price_history(uuid,uuid) to anon,authenticated;
create or replace function public.reorder_product_images(p_product uuid,p_ids uuid[]) returns void language plpgsql security invoker set search_path='' as $$begin
 if not private.is_admin() then raise exception 'Administrator access required';end if;
 if (select count(*) from public.product_images where product_id=p_product)<>cardinality(p_ids) or (select count(distinct x) from unnest(p_ids) x)<>cardinality(p_ids) or exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.product_images i where i.id=x and i.product_id=p_product)) then raise exception 'Image list changed; refresh and retry';end if;
 update public.product_images i set sort_order=u.ord-1 from unnest(p_ids) with ordinality as u(id,ord) where i.id=u.id and i.product_id=p_product;
end$$;
revoke all on function public.reorder_product_images(uuid,uuid[]) from public;
grant execute on function public.reorder_product_images(uuid,uuid[]) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy product_image_admin_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and (select private.is_admin()));
create policy product_image_admin_select on storage.objects for select to authenticated using(bucket_id='product-images' and (select private.is_admin()));
create policy product_image_admin_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and (select private.is_admin()));
create index if not exists images_product_order on public.product_images(product_id,sort_order);
create index if not exists items_list on public.shopping_list_items(list_id);
create index if not exists variants_product on public.product_variants(product_id);
create index if not exists retailer_products_variant on public.retailer_products(variant_id);
create index if not exists retailer_products_source on public.retailer_products(source_id);
-- First admin must be explicitly assigned by the database owner after registration.
-- insert into private.admin_users(user_id) select id from auth.users where email=<verified owner email>;
