import type {Row} from './domain';
import {validDiscovery,discoveryRaw} from './discoveryFeed.ts';
export function mergeComparisonFeed(products:Row[],value:unknown):Row[]{
 const rows=value&&typeof value==='object'&&Array.isArray((value as Row).rows)?(value as Row).rows:[];
 const index=new Map<string,Row[]>();for(const r of rows){if(!r?.catalog_id)continue;index.set(r.catalog_id,[...(index.get(r.catalog_id)||[]),r])}
 return products.map(p=>{
  const observations=new Map(p.observations.map((r:Row)=>[r.retailer,r]));
  for(const r of index.get(p.id)||[]){
   if(!validDiscovery({products:[{...p,observations:[r]}]}).length)continue;
   const old=observations.get(r.retailer) as Row|undefined;if(!old||Date.parse(r.observed_at)>=Date.parse(old.observed_at))observations.set(r.retailer,r);
  }
  return {...p,observations:[...observations.values()]};
 });
}
export async function fetchComparisonFeed(){
 for(const url of [discoveryRaw+'comparison-prices.json','/comparison-prices.json'])try{const r=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(r.ok)return await r.json()}catch{}
 return {rows:[]};
}
