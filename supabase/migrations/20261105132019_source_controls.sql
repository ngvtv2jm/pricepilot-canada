begin;
alter table public.data_sources add column enabled boolean not null default false;
grant insert,update on public.data_sources to authenticated;
create policy admin_sources_insert on public.data_sources for insert to authenticated with check(private.is_admin());
create policy admin_sources_update on public.data_sources for update to authenticated using(private.is_admin()) with check(private.is_admin());
create function private.validate_source_activation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.enabled and (new.authorization_status<>'authorized' or not new.allowed_redistribution or nullif(btrim(new.license_reference),'') is null or (new.license_expires_at is not null and new.license_expires_at<=now()) or not exists(select 1 from public.retailers where id=new.retailer_id and status='active')) then
 raise exception 'Activation requires an active retailer, authorized status, redistribution permission and a valid licence reference';
 end if;
 if tg_op='UPDATE' and old.enabled and new.enabled and (new.retailer_id is distinct from old.retailer_id or new.provider is distinct from old.provider or new.source_type is distinct from old.source_type or new.license_reference is distinct from old.license_reference or new.authorization_status is distinct from old.authorization_status or new.allowed_redistribution is distinct from old.allowed_redistribution or new.allowed_images is distinct from old.allowed_images or new.license_expires_at is distinct from old.license_expires_at) then raise exception 'Pause the source before changing its configuration'; end if;
 return new;
end $$;
revoke all on function private.validate_source_activation() from public;
create trigger validate_source_activation before insert or update on public.data_sources for each row execute function private.validate_source_activation();
create trigger audit_sources after insert or update or delete on public.data_sources for each row execute function private.audit_catalog_change();
create or replace function private.source_is_public(p_source uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.data_sources d join public.retailers r on r.id=d.retailer_id where d.id=p_source and d.enabled and r.status='active' and d.authorization_status='authorized' and d.allowed_redistribution and (d.license_expires_at is null or d.license_expires_at>now()))$$;
do $$declare definition text; begin
 definition=pg_get_functiondef('public.ingest_offer_batch(uuid,jsonb)'::regprocedure);
 if position('if not found or source.authorization_status' in definition)=0 then raise exception 'Unexpected ingestion function; inspect before applying'; end if;
 execute replace(definition,'if not found or source.authorization_status','if not found or not source.enabled or source.authorization_status');
end $$;
commit;
