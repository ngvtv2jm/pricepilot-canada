begin;
create table public.catalog_api_settings(provider text primary key check(provider='openfoodfacts'),enabled boolean not null default false,language text not null default 'en' check(language in ('en','fr')),canada_only boolean not null default true,import_images boolean not null default false,license_acknowledged boolean not null default false,check(not enabled or license_acknowledged));
alter table public.catalog_api_settings enable row level security;
grant select,update on public.catalog_api_settings to authenticated;
create policy admin_api_settings on public.catalog_api_settings for all to authenticated using(private.is_admin()) with check(private.is_admin());
insert into public.catalog_api_settings(provider) values('openfoodfacts');
alter table public.products add column source_provider text,add column source_url text,add column source_license text,add column source_imported_at timestamptz;
create table public.catalog_import_records(id uuid primary key default gen_random_uuid(),provider text not null,external_id text not null,product_id uuid not null references public.products(id),imported_at timestamptz not null default now(),unique(provider,external_id));
alter table public.catalog_import_records enable row level security;
grant select,insert on public.catalog_import_records to authenticated;
create policy admin_catalog_imports on public.catalog_import_records for all to authenticated using(private.is_admin()) with check(private.is_admin());
create function public.import_catalog_products(p_products jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare cfg public.catalog_api_settings; item jsonb; barcode text; pname text; pid uuid; vid uuid; bid uuid; image text; qty numeric; created integer=0; skipped integer=0;
begin
 if not private.is_admin() then raise exception 'Administrator access required'; end if;
 select * into cfg from public.catalog_api_settings where provider='openfoodfacts' for share;
 if not found or not cfg.enabled or not cfg.license_acknowledged then raise exception 'Enable the API connection after reviewing its licence'; end if;
 if p_products is null or jsonb_typeof(p_products)<>'array' or jsonb_array_length(p_products) not between 1 and 10 then raise exception 'Import 1–10 products at a time'; end if;
 for item in select value from jsonb_array_elements(p_products) loop
  barcode=item->>'code'; pname=btrim(item->>'name');
  if barcode is null or barcode !~ '^[0-9]{8,14}$' or pname is null or length(pname) not between 1 and 300 then raise exception 'Invalid barcode or product name'; end if;
  if cfg.canada_only and not coalesce((item->'countries') @> '["en:canada"]'::jsonb,false) then raise exception 'Product is not tagged as sold in Canada'; end if;
  perform pg_advisory_xact_lock(hashtextextended('catalog-barcode:'||barcode,0));
  if exists(select 1 from public.catalog_import_records where provider='openfoodfacts' and external_id=barcode) or exists(select 1 from public.product_identifiers where value=barcode) then skipped=skipped+1;continue;end if;
  image=case when cfg.import_images then nullif(item->>'image_url','') else null end;
  if image is not null and (length(image)>1000 or image !~ '^https://images\.openfoodfacts\.org/') then raise exception 'Unsupported source image URL'; end if;
  qty=nullif(item->>'quantity','')::numeric;
  if qty is not null and (qty<=0 or qty>1000000 or qty::text in ('NaN','Infinity','-Infinity') or coalesce(item->>'unit','') not in ('g','kg','ml','l')) then raise exception 'Invalid package quantity'; end if;
  bid=null;
  if nullif(btrim(item->>'brand'),'') is not null then
   insert into public.brands(name) values(left(btrim(item->>'brand'),200)) on conflict(name) do nothing;
   select id into bid from public.brands where name=left(btrim(item->>'brand'),200);
  end if;
  insert into public.products(name,slug,brand_id,description,image_url,source_provider,source_url,source_license,source_imported_at)
  values(pname,'off-'||barcode,bid,left(item->>'description',2000),image,'Open Food Facts','https://world.openfoodfacts.org/product/'||barcode,'ODbL 1.0; contents DbCL 1.0'||case when image is not null then '; image CC BY-SA' else '' end,now()) returning id into pid;
  insert into public.product_variants(product_id,name,quantity,unit,attributes) values(pid,left(coalesce(nullif(item->>'package_name',''),'Package size not supplied'),100),qty,case when qty is not null then item->>'unit' else null end,jsonb_build_object('Barcode',barcode,'Data source','Open Food Facts')) returning id into vid;
  insert into public.product_identifiers(variant_id,kind,value,verified) values(vid,'barcode',barcode,false);
  insert into public.catalog_import_records(provider,external_id,product_id) values('openfoodfacts',barcode,pid);
  created=created+1;
 end loop;
 return jsonb_build_object('created',created,'skipped',skipped);
end $$;
revoke all on function public.import_catalog_products(jsonb) from public,anon;
grant execute on function public.import_catalog_products(jsonb) to authenticated;
commit;
