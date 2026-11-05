import type {Row} from './domain';
const hosts:Record<string,string>={'Real Canadian Superstore':'www.realcanadiansuperstore.ca','No Frills':'www.nofrills.ca','Loblaws':'www.loblaws.ca'};
const norm=(v:unknown)=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export function validFeedRows(value:unknown,now=Date.now()):Row[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as any).rows))return [];
 return (value as any).rows.filter((r:any)=>{try{const u=new URL(r.product_url);return r.currency==='CAD'&&hosts[r.retailer]===u.hostname&&u.protocol==='https:'&&!u.username&&!u.password&&u.pathname.endsWith('/p/'+r.retailer_sku)&&typeof r.price_cad==='number'&&Number.isFinite(r.price_cad)&&r.price_cad>=0&&r.price_cad<=100000&&Number.isFinite(Date.parse(r.observed_at))&&Date.parse(r.observed_at)<=now+300000&&['name','brand','package_size','retailer_sku'].every(k=>typeof r[k]==='string'&&r[k].length>0)}catch{return false}});
}
export function mergeRetailerPrices(catalog:Record<string,Row[]>,feed:Row[]):Row[]{
 const result=new Map<string,Row>();
 const key=(r:Row)=>[r.variant_id,r.retailer,r.store_scope].join('|');
 for(const r of catalog.retail_price_observations||[])result.set(key(r),r);
 for(const r of feed){
  // Use the original source SKU plus exact name, brand and package. Never join on title alone.
  const products=(catalog.products||[]).filter(p=>{try{return new URL(p.source_url).pathname.endsWith('/p/'+r.retailer_sku)&&norm(p.name)===norm(r.name)&&norm((catalog.brands||[]).find(b=>b.id===p.brand_id)?.name)===norm(r.brand)}catch{return false}});
  if(products.length!==1)continue;
  const variants=(catalog.product_variants||[]).filter(v=>v.product_id===products[0].id&&norm(v.name)===norm(r.package_size));
  if(variants.length!==1)continue;
  const item:Row={...r,id:'feed:'+r.retailer+':'+r.retailer_sku,product_id:products[0].id,variant_id:variants[0].id};
  const old=result.get(key(item));
  if(!old||Date.parse(item.observed_at)>=Date.parse(old.observed_at))result.set(key(item),item);
 }
 return [...result.values()];
}
export async function fetchRetailerFeed():Promise<Row[]>{
 const read=async(url:string)=>{const r=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Price feed unavailable');const data=validFeedRows(await r.json());if(!data.length)throw Error('Empty price feed');return data;};
 try{return await read('https://raw.githubusercontent.com/ngvtv2jm/pricepilot-canada/main/public/retailer-prices.json')}catch{return read('/retailer-prices.json').catch(()=>[])}
}
