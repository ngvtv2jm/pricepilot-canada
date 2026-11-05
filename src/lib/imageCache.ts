import type {Row} from './domain';
const raw='https://raw.githubusercontent.com/ngvtv2jm/pricepilot-canada/main/public/';
export function applyImageCache(catalog:Record<string,Row[]>,value:unknown){
 const images=(value&&typeof value==='object'&&(value as Row).images)||{};
 return {...catalog,products:(catalog.products||[]).map(p=>{
  const item=images[p.id]||images[p.feed_id];
  if(!item||!/^catalog-cache\/[a-f0-9]{64}\.webp$/.test(item.path))return p;
  return {...p,image_url:raw+item.path,image_fallbacks:[raw+item.path,'/'+item.path,p.image_url].filter(Boolean),cached_image:true};
 })};
}
export async function fetchImageCache(){
 for(const url of [raw+'image-cache.json','/image-cache.json'])try{const r=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(10000)});if(r.ok)return await r.json()}catch{}
 return {};
}
