begin;
create function public.import_csv_products(p_rows jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb; pid uuid; vid uuid; bid uuid; code text; url text; image text; key text; pname text; qty numeric; created integer=0; skipped integer=0;
begin
 if not private.is_admin() then raise exception 'Administrator access required';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Import 1–500 rows';end if;
 -- Serialize CSV batches; barcode lock also coordinates with the API importer.
 perform pg_advisory_xact_lock(hashtextextended('csv-catalog-import',0));
 for item in select value from jsonb_array_elements(p_rows) loop
 pname=btrim(item->>'name');code=nullif(btrim(item->>'barcode'),'');url=nullif(regexp_replace(regexp_replace(btrim(item->>'source_url'),'#.*$',''),'/$',''),'');image=nullif(btrim(item->>'image_url'),'');
 if pname is null or length(pname) not between 1 and 300 then raise exception 'Product name required, maximum 300 characters';end if;
 if code is not null and code !~ '^[0-9]{8,14}$' then raise exception 'Invalid barcode';end if;
 if code is null and url is null then raise exception 'Barcode or source URL required';end if;
 if (url is not null and (length(url)>2000 or url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/|$)' or url ~ '[[:space:]]')) or (image is not null and (length(image)>2000 or image !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/|$)' or image ~ '[[:space:]]')) then raise exception 'Use HTTPS URLs without credentials or spaces';end if;
 key=case when code is not null then 'barcode:'||code else 'url:'||url end;
 if code is not null then perform pg_advisory_xact_lock(hashtextextended('catalog-barcode:'||code,0));end if;
 if exists(select 1 from public.catalog_import_records where provider='csv' and external_id=key) or exists(select 1 from public.product_identifiers where code is not null and value=code) or exists(select 1 from public.products where id::text=item->>'product_id' or (url is not null and regexp_replace(regexp_replace(source_url,'#.*$',''),'/$','')=url)) then skipped=skipped+1;continue;end if;
 qty=nullif(item->>'quantity','')::numeric;
 if qty is not null and (qty<=0 or qty>1000000 or qty::text in ('NaN','Infinity','-Infinity') or coalesce(item->>'unit','') not in ('g','kg','ml','l','each')) then raise exception 'Invalid package quantity or unit';end if;
 bid=null;
 if nullif(btrim(item->>'brand'),'') is not null then insert into public.brands(name) values(left(btrim(item->>'brand'),200)) on conflict(name) do nothing;select id into bid from public.brands where name=left(btrim(item->>'brand'),200);end if;
 pid=gen_random_uuid();
 insert into public.products(id,name,slug,brand_id,description,image_url,source_provider,source_url,source_license,source_imported_at) values(pid,pname,'csv-'||pid,bid,left(item->>'description',5000),image,coalesce(nullif(item->>'source_provider',''),'CSV import'),url,nullif(item->>'source_license',''),now());
 insert into public.product_variants(product_id,name,quantity,unit) values(pid,left(coalesce(nullif(item->>'variant_name',''),'Package size not supplied'),300),qty,case when qty is not null then item->>'unit' else null end) returning id into vid;
 if code is not null then insert into public.product_identifiers(variant_id,kind,value,verified) values(vid,'barcode',code,false);end if;
 insert into public.catalog_import_records(provider,external_id,product_id) values('csv',key,pid);
 created=created+1;
 end loop;
 return jsonb_build_object('created',created,'skipped',skipped);
end $$;
revoke all on function public.import_csv_products(jsonb) from public,anon;
grant execute on function public.import_csv_products(jsonb) to authenticated;
commit;
