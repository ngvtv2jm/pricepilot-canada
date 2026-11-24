import {productMetadata} from './product-metadata.mjs';
import fs from 'node:fs';
import {renderObservations} from './render-observations.mjs';
import {buildNavigation} from './product-navigation.mjs';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';
import {loadEnv} from 'vite';
import {renderPage,escapeHtml,httpsUrl,jsonLd} from './trust-pages.mjs';
export {escapeHtml,jsonLd} from './trust-pages.mjs';
// Reuse the application's exact matching rules; no second fuzzy-matching implementation.
const moduleUrl=(file,deps={})=>{
 let js=ts.transpileModule(fs.readFileSync('src/lib/'+file+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const [path,url] of Object.entries(deps))js=js.replaceAll("'"+path+"'", "'"+url+"'").replaceAll('"'+path+'"','"'+url+'"');
 return 'data:text/javascript;base64,'+Buffer.from(js).toString('base64');
};
const discoveryUrl=moduleUrl('discoveryFeed'),domainUrl=moduleUrl('domain');
const {mergeDiscovered,validDiscovery,discoveryPackageKey}=await import(discoveryUrl);
const {mergeComparisonFeed}=await import(moduleUrl('comparisonFeed',{'./discoveryFeed.ts':discoveryUrl}));
const {mergeRetailerPrices,validFeedRows}=await import(moduleUrl('retailerFeed'));
const helpers={...await import(domainUrl),...await import(moduleUrl('catalogPrices',{'./domain.ts':domainUrl}))};
const cachedImages=JSON.parse(fs.readFileSync('src/lib/catalogImages.json','utf8'));
const imageHelpers=ts.transpileModule(fs.readFileSync('src/lib/githubImages.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {githubProductImage}=await import('data:text/javascript;base64,'+Buffer.from(imageHelpers).toString('base64'));
const seoModule=ts.transpileModule(fs.readFileSync('src/lib/productSeo.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {seoIndex,relatedProducts,productGroup,brandPath,productPath,applyDescriptions}=await import('data:text/javascript;base64,'+Buffer.from(seoModule).toString('base64'));
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
 const descriptions=fs.existsSync('public/product-descriptions.json')?JSON.parse(fs.readFileSync('public/product-descriptions.json','utf8')):{entries:{}};
 const readJson=name=>JSON.parse(fs.readFileSync('public/'+name,'utf8'));
 const snapshots=mergeRetailerPrices(catalog,validFeedRows(readJson('retailer-prices.json')));
 const discovered=validDiscovery(readJson('discovered-catalog.json'));
 // Keep publishing identity independent of price freshness and retailer URL changes.
 const merged=applyDescriptions(mergeDiscovered({...catalog,retail_price_observations:snapshots},discovered),descriptions);
 const variantsByProduct=helpers.groupBy(merged.product_variants,v=>v.product_id);
 const canonicalByAlias=new Map(merged.products.flatMap(p=>(p.feed_aliases||[]).map(id=>[id,p.id])));
 const finalRows=new Map(merged.retail_price_observations.map(r=>[r.variant_id+'|'+r.retailer,r]));
 for(const p of mergeComparisonFeed(discovered,readJson('comparison-prices.json'))){
  const productId=canonicalByAlias.get(p.id);
  const candidates=(variantsByProduct.get(productId)||[]).filter(v=>discoveryPackageKey(v.name)===discoveryPackageKey(p.package_size));
  if(candidates.length!==1)continue;
  const variant=candidates[0];
  for(const r of p.observations){
   const key=variant.id+'|'+r.retailer,old=finalRows.get(key);
   if(!old||Date.parse(r.observed_at)>Date.parse(old.observed_at))finalRows.set(key,{...r,product_id:productId,variant_id:variant.id});
  }
 }
 const observations=helpers.groupBy([...finalRows.values()],r=>r.variant_id);
 const publishTime=Date.now();
 const seoProducts=merged.products.map(p=>({...p,brand_name:merged.brands.find(b=>b.id===p.brand_id)?.name||''}));
 const relatedIndex=seoIndex(seoProducts);
 const imageCache=JSON.parse(fs.readFileSync('public/image-cache.json','utf8')).images||{};
 const photosByProduct=helpers.groupBy(merged.product_images||[],r=>r.product_id);
 function featuredImage(p){
  const cached=[p.feed_id,p.id,...(p.feed_aliases||[])].map(id=>imageCache[id]?.path).find(path=>/^catalog-cache\/[a-f0-9]{64}\.webp$/.test(path||''));
  const photos=[...(photosByProduct.get(p.id)||[])].sort((a,b)=>a.sort_order-b.sort_order).map(photo=>photo.url).concat(p.image_url||'');
  return [cached?'/'+cached:'',...photos.map(photo=>Object.hasOwn(cachedImages,photo)?cachedImages[photo]:photo)].map(githubProductImage)
   .find(url=>/^https:\/\/raw\.githubusercontent\.com\/ngvtv2jm\/pricepilot-canada\/main\/public\/(?:catalog-cache\/[a-f0-9]{64}|catalog-images\/[a-zA-Z0-9_-]+)\.webp$/.test(url))||null;
 }
 const navigation=buildNavigation(base,seoProducts,{productGroup,brandPath,productPath,variantsByProduct,observations,helpers,publishTime,featuredImage});
 fs.mkdirSync('public/products',{recursive:true});
 const paths=[...navigation.paths];const expected=new Set();
 for(const p of merged.products){
  if(!/^[a-zA-Z0-9-]+$/.test(p.id))throw Error('Invalid product identifier');
  const path='products/'+p.id+'.html',url=base+'/'+path.replace(/\.html$/,'');
  const photo=merged.product_images?.filter(i=>i.product_id===p.id).sort((a,b)=>a.sort_order-b.sort_order)[0]?.url||p.image_url;
  const cached=imageCache[p.feed_id||p.id]?.path;
  const image=httpsUrl(githubProductImage(cached&&/^catalog-cache\/[a-f0-9]{64}\.webp$/.test(cached)?'/'+cached:cachedImages[photo]||photo||''))||base+'/pricepine-social-card.png';
  const brand=merged.brands.find(b=>b.id===p.brand_id)?.name;
  const pv=[...new Map((variantsByProduct.get(p.id)||[]).map(v=>[v.id,v])).values()];
  const tables=new Map(pv.map(v=>[v.id,renderObservations(v,observations.get(v.id)||[],helpers,publishTime)]));
  const {title,description:desc}=productMetadata(p,brand,pv,[...tables.values()].some(Boolean));
  // Website observations in the current inputs do not verify availability. A dated
  // reading is not an offer; don't emit an incomplete Product rich-result entity.
  // Keep BreadcrumbList and social metadata. Rich-result markup can be enabled only
  // once exact-package, available retailer offers have a freshness-enforced source.
  let body=`<h1>${escapeHtml(p.name)}</h1><img src="${escapeHtml(image)}" alt="${escapeHtml(p.name)}" width="800" height="800" referrerpolicy="no-referrer"><div data-product-description data-product-id="${p.id}" data-product-name="${escapeHtml(p.name)}" data-description-ids="${[p.id,p.feed_id,...(p.feed_aliases||[])].filter(Boolean).join(',')}"><p data-description-text>${escapeHtml(p.description||desc)}</p><p data-description-source>${p.description_source?`<a href="${escapeHtml(p.description_source)}" rel="noopener noreferrer">Description source: ${escapeHtml(p.description_source_label||'Retailer')}</a> · Checked ${escapeHtml(p.description_checked_at.slice(0,10))}`:''}</p></div>${httpsUrl(p.source_url)?`<p>Product source: <a href="${escapeHtml(httpsUrl(p.source_url))}" rel="noopener noreferrer">${escapeHtml(p.source_provider||'Retailer')}</a>. ${escapeHtml(p.source_license||'')}</p>`:''}<h2>Package options & specifications</h2>${pv.map(v=>`<h3>${escapeHtml(v.name)}</h3><p>${escapeHtml([v.quantity,v.unit].filter(x=>x!=null).join(' '))}</p>${Object.keys(v.attributes||{}).length?`<table><caption>${escapeHtml(v.name)} specifications</caption><tbody>${Object.entries(v.attributes||{}).filter(([,val])=>['string','number','boolean'].includes(typeof val)).map(([k,val])=>`<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(val)}</td></tr>`).join('')}</tbody></table>`:''}${tables.get(v.id)}`).join('')}<p><a href="/#product/${p.id}">Check current store prices and add to your shopping list →</a></p><p>Prices and availability change. Open the comparison to check dated retailer observations and eligible branch offers. Source-backed descriptions can refresh between publications; other product information updates when the site is published.</p>`;
  const full=seoProducts.find(q=>q.id===p.id);const group=productGroup(full);const others=relatedProducts(full,relatedIndex);
  const breadcrumbs=[{name:'Home',item:base+'/'},{name:'All products',item:base+'/catalog'}];
  let contextLinks='';
  if(group&&navigation.groups.get(group[0])?.items.length>=2){contextLinks+=`<a href="/categories/${group[0]}">Browse more ${escapeHtml(group[1].toLowerCase())}</a>`;breadcrumbs.push({name:group[1],item:base+'/categories/'+group[0]});}
  if(brand&&navigation.brands.get(brandPath(brand).split('/')[2])?.items.length>=2)contextLinks+=`${contextLinks?' · ':''}<a href="${brandPath(brand)}">More products from ${escapeHtml(brand)}</a>`;
  breadcrumbs.push({name:p.name,item:url});
  body+=`<p>${contextLinks}</p><script type="application/ld+json">${jsonLd({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:breadcrumbs.map((b,i)=>({'@type':'ListItem',position:i+1,...b}))})}</script>`;
  if(others.length)body+=`<section aria-labelledby="related-products"><h2 id="related-products">Related products</h2><p>Explore similar products and package sizes. These are browsing suggestions, not exact-package price comparisons.</p><ul class="related-grid">${others.map(q=>{const photo=merged.product_images.find(i=>i.product_id===q.id)?.url||q.image_url;const cached=imageCache[q.feed_id||q.id]?.path;const image=httpsUrl(githubProductImage(cached?'/'+cached:cachedImages[photo]||photo||''));return `<li><a href="${productPath(q.id)}">${image?`<img src="${escapeHtml(image)}" alt="${escapeHtml(q.name)}" width="180" height="180" loading="lazy">`:''}<strong>${escapeHtml(q.name)}</strong></a>${q.brand_name?`<p>${escapeHtml(q.brand_name)}</p>`:''}</li>`}).join('')}</ul></section>`;
  body+='<script src="/product-description.js" defer></script>';
  fs.writeFileSync('public/'+path,renderPage({base,path,title,description:desc,image,body}));paths.push(path);expected.add(p.id+'.html');
  // Preserve shared URLs for feed products merged into a database product, without indexing duplicates.
  for(const alias of p.feed_aliases||[]){if(alias===p.id)continue;const name=alias+'.html';if(!/^discovered-[a-f0-9]{24}\.html$/.test(name))continue;fs.writeFileSync('public/products/'+name,renderPage({base,path,title,description:desc,image,body,noindex:true}));expected.add(name)}
 }
 for(const name of fs.readdirSync('public/products'))if(name.endsWith('.html')&&!expected.has(name))fs.unlinkSync('public/products/'+name);
 const count=100, pageCount=Math.ceil(merged.products.length/count);
 for(let i=0;i<pageCount;i++){
  const path=i?'catalog-'+(i+1)+'.html':'catalog.html';paths.push(path);
  const body=`<h1>Product directory${i?' — page '+(i+1):''}</h1><p>Browse exact products and package sizes. Open a comparison for dated retailer prices.</p><p><a href="/categories">Browse by product type</a> · <a href="/brands">Browse by brand</a></p><ul>${merged.products.slice(i*count,(i+1)*count).map(p=>`<li><a href="${productPath(p.id)}">${escapeHtml(p.name)}</a></li>`).join('')}</ul><nav aria-label="Directory pages">${Array.from({length:pageCount},(_,n)=>`<a ${n===i?'aria-current="page"':''} href="/${n?'catalog-'+(n+1):'catalog'}">Page ${n+1}</a>`).join(' · ')}</nav>`;
  fs.writeFileSync('public/'+path,renderPage({base,path,title:'Product directory — page '+(i+1),description:'Browse PricePine Canadian grocery products and package sizes, directory page '+(i+1)+'.',body}));
 }
 fs.writeFileSync('public/product-page-ids.json',JSON.stringify(merged.products.map(p=>p.id)));
 console.log('Built '+merged.products.length+' canonical product pages.');return paths;
}
