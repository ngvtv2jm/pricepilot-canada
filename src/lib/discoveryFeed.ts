import type {Row} from './domain';
const pcHosts=['www.realcanadiansuperstore.ca','www.nofrills.ca','www.loblaws.ca'];
const hosts:Record<string,string>={'Real Canadian Superstore':pcHosts[0],'No Frills':pcHosts[1],Loblaws:pcHosts[2],'Giant Tiger':'www.gianttiger.com'};
const norm=(s:unknown)=>String(s??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const size=(s:unknown)=>norm(s).replace(/×/g,'x').replace(/(\d)\s*-?\s*(kg|g|ml|l|lb|oz|pk|pack|count|ct)\b/g,'$1 $2');
export function fingerprint(name:string,brand:string,pack:string){
 brand=norm(brand);name=norm(name);pack=size(pack);
 if(!brand||brand==='giant tiger'||!pack)return '';
 if(name.startsWith(brand+' '))name=name.slice(brand.length).trim();
 if(size(name).endsWith(pack))name=size(name).slice(0,-pack.length).replace(/[ ,\-]+$/,'');
 return [brand,name.replace(/[^\p{L}\p{N}_]+/gu,' ').trim(),pack].join('|');
}
export function validDiscovery(value:unknown,now=Date.now()):Row[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as Row).products))return [];
 return (value as Row).products.filter((p:Row)=>{
  if(!p||!/^discovered-[a-f0-9]{24}$/.test(p.id)||typeof p.name!=='string'||p.name.length>500||typeof p.brand!=='string'||typeof p.package_size!=='string'||!p.package_size||!Array.isArray(p.observations)||!p.observations.length)return false;
  return p.observations.every((r:Row)=>{try{const u=new URL(r.product_url);return u.protocol==='https:'&&u.hostname===hosts[r.retailer]&&!u.username&&!u.password&&typeof r.retailer_sku==='string'&&r.retailer_sku.length>0&&(r.retailer==='Giant Tiger'?/^\/products\/[a-z0-9-]+$/.test(u.pathname):u.pathname.endsWith('/p/'+r.retailer_sku))&&r.currency==='CAD'&&typeof r.price_cad==='number'&&Number.isFinite(r.price_cad)&&r.price_cad>0&&r.price_cad<=100000&&Number.isFinite(Date.parse(r.observed_at))&&Date.parse(r.observed_at)<=now+300000&&size(r.package_size)===size(p.package_size)}catch{return false}});
 });
}
export function mergeDiscovered(catalog:Record<string,Row[]>,products:Row[]):Record<string,Row[]>{
 const out=Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,[...v]]));
 for(const key of ['products','product_variants','brands','categories','retail_price_observations'])out[key]??=[];
 const bySource=new Map<string,Set<Row>>(),byFingerprint=new Map<string,Set<Row>>(),byId=new Map<string,Row>();
 const variantIndex=new Map<string,Row[]>();
 const brandNames=new Map(out.brands.map(b=>[b.id,b.name]));
 const sourceKey=(url:string)=>{try{const u=new URL(url);const sku=u.pathname.match(/\/p\/([^/]+)$/)?.[1];return pcHosts.includes(u.hostname)&&sku?'pc:'+sku:u.origin+u.pathname.replace(/\/$/,'')}catch{return ''}};
 const index=(map:Map<string,Set<Row>>,key:string,p:Row)=>{if(!key)return;const set=map.get(key)||new Set<Row>();set.add(p);map.set(key,set)};
 for(const v of out.product_variants){const key=v.product_id+'|'+size(v.name);variantIndex.set(key,[...(variantIndex.get(key)||[]),v])}
 function indexProduct(p:Row,pack:string){
  byId.set(p.id,p);const source=sourceKey(p.source_url);if(source)index(bySource,[source,norm(p.name),size(pack)].join('|'),p);
  index(byFingerprint,fingerprint(p.name,brandNames.get(p.brand_id)||'',pack),p);
 }
 for(const p of out.products)for(const v of out.product_variants.filter(v=>v.product_id===p.id))indexProduct(p,v.name);
 const priceIndex=new Map(out.retail_price_observations.map((r,i)=>[r.variant_id+'|'+r.retailer,i]));
 for(const item of products){
  const candidates=new Set<Row>();const existing=byId.get(item.id);if(existing)candidates.add(existing);
  for(const r of item.observations){const key=[sourceKey(r.product_url),norm(r.name),size(item.package_size)].join('|');for(const p of bySource.get(key)||[])candidates.add(p)}
  for(const p of byFingerprint.get(fingerprint(item.name,item.brand,item.package_size))||[])candidates.add(p);
  const matching=[...candidates].filter(p=>(variantIndex.get(p.id+'|'+size(item.package_size))||[]).length===1);
  if(matching.length>1)continue;
  let product=matching[0];
  if(!product){
   let brand=out.brands.find(b=>norm(b.name)===norm(item.brand));
   if(!brand&&item.brand){brand={id:'discovery-brand:'+norm(item.brand),name:item.brand};out.brands.push(brand)}
   let category=out.categories.find(c=>norm(c.name)===norm(item.category||'Groceries'));
   if(!category){category={id:'discovery-groceries',name:'Groceries'};out.categories.push(category)}
   const image=typeof item.image_url==='string'&&/^https:\/\//.test(item.image_url)?item.image_url:'';
   product={id:item.id,name:item.name,brand_id:brand?.id,category_id:category.id,description:item.description,image_url:image,source_provider:item.observations[0].retailer,source_url:item.observations[0].product_url,source_license:'Public retailer listing',discovered:true};out.products.push(product);
   const newVariant={id:item.id+'-variant',product_id:product.id,name:item.package_size,attributes:{},discovered:true};out.product_variants.push(newVariant);variantIndex.set(product.id+'|'+size(item.package_size),[newVariant]);brandNames.set(brand?.id,brand?.name||'');indexProduct(product,item.package_size);
  }
  if(!product.feed_id) {const index=out.products.findIndex(p=>p.id===product.id);product={...product,feed_id:item.id};out.products[index]=product;}
  const variant=variantIndex.get(product.id+'|'+size(item.package_size))?.[0];if(!variant)continue;
  for(const r of item.observations){
   const priceKey=variant.id+'|'+r.retailer;const index=priceIndex.get(priceKey)??-1;
   const previous=out.retail_price_observations[index];
   if(previous&&Date.parse(previous.observed_at)>Date.parse(r.observed_at))continue;
   const row={...r,id:'discovery-price:'+r.retailer+':'+r.retailer_sku,product_id:product.id,variant_id:variant.id,store_scope:previous?.store_scope||r.store_scope};
   if(index>=0)out.retail_price_observations[index]=row;else {priceIndex.set(priceKey,out.retail_price_observations.length);out.retail_price_observations.push(row);}
  }
 }
 return out;
}
export const discoveryRaw='https://raw.githubusercontent.com/ngvtv2jm/pricepilot-canada/main/public/';
export async function fetchDiscovery():Promise<Row[]>{
 const read=async(url:string)=>{const res=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error('Catalog feed unavailable');return validDiscovery(await res.json())};
 try{return await read(discoveryRaw+'discovered-catalog.json')}catch{return read('/discovered-catalog.json').catch(()=>[])}
}
