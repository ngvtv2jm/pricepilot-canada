import fs from 'node:fs';
import {renderPage,escapeHtml,httpsUrl} from './trust-pages.mjs';
// These guides explain what to compare, never imply stock or nationwide pricing.
const categoryNotes={
 milk:{title:'Compare milk prices in Canada',detail:'Match the fat percentage and carton size before comparing. Price per litre helps compare different carton sizes, but compare dairy and plant-based drinks separately.',related:['eggs','bread']},
 eggs:{title:'Compare egg prices in Canada',detail:'Compare the same egg size and carton count first. For different pack sizes, convert the price to a cost per egg or per dozen. Organic and conventional eggs can have different prices.',related:['milk','bread']},
 coffee:{title:'Compare coffee prices in Canada',detail:'Compare beans with beans and ground coffee with ground coffee. Use price per 100 g across different bag sizes, and compare single-serve pods by pod count.',related:['tea','cereal']},
 bread:{title:'Compare bread prices in Canada',detail:'Compare the same type of bread and check the loaf weight. Price per 100 g can help compare different weights; a cheaper loaf is not always cheaper by weight.',related:['eggs','milk']},
 pasta:{title:'Compare pasta prices in Canada',detail:'Match the pasta type and package weight. Price per 100 g can help compare differently sized dry pasta packages. Keep fresh and dry pasta separate, and compare plain pasta separately from seasoned instant noodles.',related:['sauce','rice']},
};
// Keep the lead comparisons narrower than the catalog's broad browsing groups.
export function stapleMatch(category,name){
 const n=String(name).toLowerCase().normalize('NFKC');
 if(category==='eggs')return /\beggs?\b/.test(n)&&!/\b(?:breakfast|steak|potatoes|sandwich|meal|liquid|whites|chocolate|mini eggs|pickled|kinder)\b/.test(n);
 if(category==='milk')return /\bmilk\b/.test(n)&&!/\b(?:bar|candy|chocolate bar|creamer|powder|condensed|evaporated|ice cream|bath|almond|oat|coconut|soy)\b/.test(n);
 if(category==='pasta')return /\b(?:pasta|spaghetti|macaroni|noodles|penne)\b/.test(n)&&!/\b(?:sauce|salad|dressing|mix|soup|meal|dinner|bowl|topping|seasoning|kit|side dish)\b/.test(n);
 if(category==='coffee')return (/\bespresso\b/.test(n)||/\bcoffee\b/.test(n)&&/\b(?:beans?|ground|roast|instant|pods?|k-cups?)\b/.test(n))&&!/\b(?:creamer|enhancer|whitener|coffee[ -]+mate|wafer|crisp|candy|bar|ice cream|drink|cake|cookie|chocolate|syrup|beverage|iced)\b/.test(n);
 if(category==='bread')return /\b(?:bread|bagels?|buns?|loaf|focaccia|tortillas?)\b/.test(n)&&!/\b(?:chips|crisps|crumbs|croutons|mix|crackers|pudding|dippers)\b/.test(n);
 return false;
}
const cad=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'});
const day=new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeZone:'America/Toronto'});
export function recentCategoryMatches(products,{variantsByProduct,observations,helpers,publishTime},limit=6){
 if(!variantsByProduct||!observations||!helpers)return [];
 const matches=[];
 for(const p of products){
  for(const variant of variantsByProduct.get(p.id)||[]){
   const rows=(observations.get(variant.id)||[]).filter(r=>r.currency==='CAD'&&r.check_status==='verified'&&r.retailer&&httpsUrl(r.product_url)&&helpers.cadAmount(r.price_cad)>0&&helpers.websiteState(r,publishTime)==='current');
   const packages=new Map();
   for(const row of rows){
    const label=String(row.package_size||'').trim();
    if(!label)continue;
    const key=label.toLowerCase().replace(/\s+/g,'');
    const entry=packages.get(key)||{label,rows:new Map()};
    const existing=entry.rows.get(row.retailer);
    if(!existing||Date.parse(row.observed_at)>Date.parse(existing.observed_at))entry.rows.set(row.retailer,row);
    packages.set(key,entry);
   }
   for(const {label,rows:retailers} of packages.values()){
    if(retailers.size<2)continue;
    const sorted=[...retailers.values()].sort((a,b)=>Number(a.price_cad)-Number(b.price_cad));
    matches.push({p,label,low:sorted[0],high:sorted.at(-1),count:sorted.length});
   }
  }
 }
 return matches.sort((a,b)=>b.count-a.count||a.p.name.localeCompare(b.p.name)||a.p.id.localeCompare(b.p.id)).slice(0,limit);
}
export function buildNavigation(base,products,{productGroup,brandPath,productPath,...observedPrices}){
 const paths=[],groups=new Map(),brands=new Map();
 for(const p of products){const group=productGroup(p);if(group){const list=groups.get(group[0])||{label:group[1],items:[]};list.items.push(p);groups.set(group[0],list)}if(p.brand_name){const key=brandPath(p.brand_name).split('/')[2];const list=brands.get(key)||{label:p.brand_name,items:[]};list.items.push(p);brands.set(key,list)}}
 function write(path,title,description,body){fs.mkdirSync('public/'+path.split('/').slice(0,-1).join('/'),{recursive:true});fs.writeFileSync('public/'+path,renderPage({base,path,title,description,body}));paths.push(path)}
 for(const [kind,collection,label] of [['categories',groups,'Browse product types'],['brands',brands,'Browse grocery brands']]){
  const visible=[...collection].filter(([,g])=>g.items.length>=2).sort((a,b)=>a[1].label.localeCompare(b[1].label));
  write(kind+'.html',label,'Explore PricePine products by '+(kind==='brands'?'brand':'product type')+'.',`<h1>${label}</h1><p>Explore products and exact package sizes, then open a product to compare dated retailer prices.</p><ul>${visible.map(([key,g])=>`<li><a href="/${kind}/${key}">${escapeHtml(g.label)}</a> (${g.items.length} products)</li>`).join('')}</ul><p><a href="/catalog">Browse all products</a></p>`);
  for(const [key,g] of visible){const count=Math.ceil(g.items.length/100);for(let i=0;i<count;i++){
   const slug=key+(i?'-'+(i+1):'');
   const guide=kind==='categories'&&!i?categoryNotes[key]:null;
   const pageSuffix=i?` (page ${i+1})`:'';
   const title=guide?.title||`${g.label} Grocery Price Comparisons${pageSuffix}`;
   const description=guide
    ? `${guide.title}. Browse ${g.items.length} listed products and open a matching package for dated retailer website prices where available.`
    : `Explore ${g.label} grocery products and exact package sizes${pageSuffix}. Open a product for dated retailer prices and conditions where available.`;
   const related=guide?.related.filter(k=>groups.get(k)?.items.length>=2)||[];
   const guideBody=guide?`<section aria-label="Comparison tips"><h2>How to compare</h2><p>${escapeHtml(guide.detail)}</p><p>Prices are dated website observations, not a guarantee of local price or stock. <a href="/about">See how PricePine checks prices</a>.</p>${related.length?`<p>Related categories: ${related.map(k=>`<a href="/categories/${k}">${escapeHtml(groups.get(k).label)}</a>`).join(' · ')}</p>`:''}</section>`:'';
   const matches=guide?recentCategoryMatches(g.items.filter(p=>stapleMatch(key,p.name)),observedPrices):[];
   const comparisonBody=matches.length?`<section aria-label="Dated price comparisons"><h2>Compare matching packages</h2><p>Each row shows the range across at least two retailer websites with verified price reads within 48 hours of this page build. Follow the product link for all retailer prices, dates and unit prices. Local price and stock are not verified.</p><div style="overflow-x:auto" tabindex="0"><table><thead><tr><th scope="col">Product and package</th><th scope="col">Observed range (CAD)</th><th scope="col">Retailer websites</th></tr></thead><tbody>${matches.map(({p,label,low,high,count})=>`<tr><th scope="row"><a href="${productPath(p.id)}">${escapeHtml((p.brand_name&&!p.name.toLowerCase().includes(p.brand_name.toLowerCase())?p.brand_name+' ':'')+p.name)}</a> · ${escapeHtml(label)}</th><td>${cad.format(low.price_cad)}${Number(low.price_cad)===Number(high.price_cad)?'':' to '+cad.format(high.price_cad)}</td><td>${count}; low at ${escapeHtml(low.retailer)} (${day.format(new Date(low.observed_at))} ET)</td></tr>`).join('')}</tbody></table></div></section>`:'';
   const body=`<h1>${escapeHtml(guide?.title||g.label)}${i?' — page '+(i+1):''}</h1><p>Browse ${escapeHtml(g.label)} products and package sizes available in the PricePine catalog. Open a product for dated retailer observations and conditions.</p>${guideBody}${comparisonBody}<ul>${g.items.slice(i*100,(i+1)*100).map(p=>`<li><a href="${productPath(p.id)}">${escapeHtml(p.name)}</a>${p.brand_name?' — '+escapeHtml(p.brand_name):''}</li>`).join('')}</ul><nav aria-label="Product pages">${Array.from({length:count},(_,n)=>`<a href="/${kind}/${key+(n?'-'+(n+1):'')}" ${i===n?'aria-current="page"':''}>Page ${n+1}</a>`).join(' · ')}</nav><p><a href="/${kind}">${label}</a> · <a href="/catalog">All products</a></p>`;
   write(`${kind}/${slug}.html`,title,description,body);
  }}
 }
 for(const kind of ['categories','brands'])if(fs.existsSync('public/'+kind))for(const name of fs.readdirSync('public/'+kind))if(name.endsWith('.html')&&!paths.includes(kind+'/'+name))fs.unlinkSync('public/'+kind+'/'+name);
 return {paths,groups,brands};
}
