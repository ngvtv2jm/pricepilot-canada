import type {Row} from './domain';
import {productGroup} from './productSeo.ts';
import {websiteOffers} from './catalogPrices.ts';
export const activityKey='pricepine-product-activity-v1';
export type ProductActivity=Record<string,{views:number;lastViewed:number}>;
export function parseActivity(value:string|null,now=Date.now()):ProductActivity{try{const data=JSON.parse(value||'{}');if(!data||Array.isArray(data)||typeof data!=='object')return {};return Object.fromEntries(Object.entries(data).filter(([id,a]:[string,any])=>/^[a-zA-Z0-9-]+$/.test(id)&&a&&Number.isInteger(a.views)&&a.views>0&&a.views<=1000000&&Number.isFinite(a.lastViewed)&&a.lastViewed>0&&a.lastViewed<=now).sort(([,a]:any,[,b]:any)=>b.lastViewed-a.lastViewed).slice(0,100)) as ProductActivity}catch{return {}}}
export function recordView(activity:ProductActivity,id:string,now=Date.now()):ProductActivity{return parseActivity(JSON.stringify({...activity,[id]:{views:Math.min(1000000,(activity[id]?.views||0)+1),lastViewed:now}}),now)}
export function homeCatalog(catalog:Record<string,Row[]>,now=Date.now()){
 const byVariant=new Map<string,Row[]>();for(const row of catalog.retail_price_observations||[]){const time=Date.parse(row.observed_at);if(!Number.isFinite(time)||time>now)continue;const list=byVariant.get(row.variant_id)||[];list.push(row);byVariant.set(row.variant_id,list)}
 const variants=new Map<string,Row[]>();for(const v of catalog.product_variants||[]){const list=variants.get(v.product_id)||[];list.push(v);variants.set(v.product_id,list)}
 const brands=new Map((catalog.brands||[]).map(b=>[b.id,b.name]));
 const images=new Map<string,string>();for(const i of [...(catalog.product_images||[])].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)))if(!images.has(i.product_id))images.set(i.product_id,i.url);
 const products=(catalog.products||[]).map(p=>{const choices=(variants.get(p.id)||[]).map(v=>{const rows=byVariant.get(v.id)||[];const offers=websiteOffers(rows,false,now);return {variant:v,rows,offers,retailers:new Set(offers.map(o=>o.row.retailer)).size,fresh:offers.some(o=>o.state==='current')}}).sort((a,b)=>Number(b.fresh)-Number(a.fresh)||b.retailers-a.retailers);const chosen=choices[0];return {...p,brand_name:brands.get(p.brand_id)||'',image_url:images.get(p.id)||p.image_url,group:productGroup(p),variant:chosen?.variant,rows:chosen?.rows||[],retailers:chosen?.retailers||0,fresh:chosen?.fresh||false} as Row});
 const categories=new Map<string,Row>();for(const p of products){if(!p.group)continue;const [key,label]=p.group;const c=categories.get(key)||{key,label,count:0,image:p.image_url,example:p};c.count++;if(!c.image&&p.image_url){c.image=p.image_url;c.example=p}categories.set(key,c)}
 const featured=[...products].filter(p=>p.image_url&&p.rows.length).sort((a,b)=>Number(b.fresh)-Number(a.fresh)||b.retailers-a.retailers||a.name.localeCompare(b.name));
 const retailers=[...new Set((catalog.retail_price_observations||[]).map(r=>r.retailer))].filter(Boolean).sort();
 return {products,featured,categories:[...categories.values()].sort((a,b)=>b.count-a.count),retailers,comparable:products.filter(p=>p.retailers>1).length};
}
