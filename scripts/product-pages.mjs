import fs from 'node:fs';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';
import {loadEnv} from 'vite';
import {renderPage,escapeHtml,httpsUrl} from './trust-pages.mjs';
export {escapeHtml,jsonLd} from './trust-pages.mjs';
// Reuse the application's exact matching rules; no second fuzzy-matching implementation.
const compiled=ts.transpileModule(fs.readFileSync('src/lib/discoveryFeed.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {mergeDiscovered,validDiscovery}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const cachedImages=JSON.parse(fs.readFileSync('src/lib/catalogImages.json','utf8'));
export async function buildProductPages(base){
 const env={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
 let catalog=JSON.parse(fs.readFileSync('public/catalog-snapshot.json','utf8'));
 if(env.VITE_SUPABASE_URL&&env.VITE_SUPABASE_ANON_KEY){
  const db=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  async function read(table){const out=[];for(let offset=0;offset<50000;offset+=500){const {data,error}=await db.from(table).select('*').order('id').range(offset,offset+499);if(error)throw Error('Product page build: '+table+': '+error.message);out.push(...data);if(data.length<500)return out}throw Error('Product snapshot exceeds build limit')}
  catalog=Object.fromEntries(await Promise.all(['products','product_variants','product_images','brands'].map(async t=>[t,await read(t)])));
  // Only public catalog tables; never export account or operational records.
  fs.writeFileSync('public/catalog-snapshot.json',JSON.stringify(catalog));
 }else console.log('Product snapshots: using saved public catalog; database unavailable.');
 const merged=mergeDiscovered(catalog,validDiscovery(JSON.parse(fs.readFileSync('public/discovered-catalog.json','utf8'))));
 const imageCache=JSON.parse(fs.readFileSync('public/image-cache.json','utf8')).images||{};
 fs.mkdirSync('public/products',{recursive:true});
 const paths=[];const expected=new Set();
 for(const p of merged.products){
  if(!/^[a-zA-Z0-9-]+$/.test(p.id))throw Error('Invalid product identifier');
  const path='products/'+p.id+'.html',url=base+'/'+path;
  const desc=(p.description||'Compare available prices, package options and specifications for '+p.name+' on PricePine Canada.').slice(0,300);
  const photo=merged.product_images?.filter(i=>i.product_id===p.id).sort((a,b)=>a.sort_order-b.sort_order)[0]?.url||p.image_url;
  const cached=imageCache[p.feed_id||p.id]?.path;
  const image=cached&&/^catalog-cache\/[a-f0-9]{64}\.webp$/.test(cached)?base+'/'+cached:cachedImages[photo]?base+cachedImages[photo]:httpsUrl(photo)||base+'/pricepine-social-card.png';
  const brand=merged.brands.find(b=>b.id===p.brand_id)?.name;
  const pv=merged.product_variants.filter(v=>v.product_id===p.id);
  const schema={'@context':'https://schema.org','@type':'Product',name:p.name,description:desc,image,...(brand?{brand:{'@type':'Brand',name:brand}}:{}),url};
  const body=`<h1>${escapeHtml(p.name)}</h1><img src="${escapeHtml(image)}" alt="${escapeHtml(p.name)}" width="800" height="800" referrerpolicy="no-referrer"><p>${escapeHtml(desc)}</p>${httpsUrl(p.source_url)?`<p>Product source: <a href="${escapeHtml(httpsUrl(p.source_url))}" rel="noopener noreferrer">${escapeHtml(p.source_provider||'Retailer')}</a>. ${escapeHtml(p.source_license||'')}</p>`:''}<h2>Package options & specifications</h2>${pv.map(v=>`<h3>${escapeHtml(v.name)}</h3><p>${escapeHtml([v.quantity,v.unit].filter(x=>x!=null).join(' '))}</p>${Object.keys(v.attributes||{}).length?`<table><caption>${escapeHtml(v.name)} specifications</caption><tbody>${Object.entries(v.attributes||{}).filter(([,val])=>['string','number','boolean'].includes(typeof val)).map(([k,val])=>`<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(val)}</td></tr>`).join('')}</tbody></table>`:''}`).join('')}<p><a href="/#product/${p.id}">Check current store prices and add to your shopping list →</a></p><p>Prices and availability change. Open the comparison to check dated retailer observations and eligible branch offers. Product information on this page updates when the site is published.</p>`;
  fs.writeFileSync('public/'+path,renderPage({base,path,title:p.name,description:desc,image,body,schema}));paths.push(path);expected.add(p.id+'.html');
  // Preserve shared URLs for feed products merged into a database product, without indexing duplicates.
  for(const alias of p.feed_aliases||[]){if(alias===p.id)continue;const name=alias+'.html';if(!/^discovered-[a-f0-9]{24}\.html$/.test(name))continue;fs.writeFileSync('public/products/'+name,renderPage({base,path,title:p.name,description:desc,image,body,noindex:true}));expected.add(name)}
 }
 for(const name of fs.readdirSync('public/products'))if(name.endsWith('.html')&&!expected.has(name))fs.unlinkSync('public/products/'+name);
 const count=100, pageCount=Math.ceil(merged.products.length/count);
 for(let i=0;i<pageCount;i++){
  const path=i?'catalog-'+(i+1)+'.html':'catalog.html';paths.push(path);
  const body=`<h1>Product directory${i?' — page '+(i+1):''}</h1><p>Browse exact products and package sizes. Open a comparison for dated retailer prices.</p><ul>${merged.products.slice(i*count,(i+1)*count).map(p=>`<li><a href="/products/${p.id}.html">${escapeHtml(p.name)}</a></li>`).join('')}</ul><nav aria-label="Directory pages">${Array.from({length:pageCount},(_,n)=>`<a ${n===i?'aria-current="page"':''} href="/${n?'catalog-'+(n+1)+'.html':'catalog.html'}">Page ${n+1}</a>`).join(' · ')}</nav>`;
  fs.writeFileSync('public/'+path,renderPage({base,path,title:'Product directory — page '+(i+1),description:'Browse PricePine Canadian grocery products and package sizes, directory page '+(i+1)+'.',body}));
 }
 console.log('Built '+merged.products.length+' canonical product pages.');return paths;
}
