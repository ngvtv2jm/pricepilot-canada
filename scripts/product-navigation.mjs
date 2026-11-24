import fs from 'node:fs';
import {renderPage,escapeHtml} from './trust-pages.mjs';
export function buildNavigation(base,products,{productGroup,brandPath,productPath}){
 const paths=[],groups=new Map(),brands=new Map();
 for(const p of products){const group=productGroup(p);if(group){const list=groups.get(group[0])||{label:group[1],items:[]};list.items.push(p);groups.set(group[0],list)}if(p.brand_name){const key=brandPath(p.brand_name).split('/')[2];const list=brands.get(key)||{label:p.brand_name,items:[]};list.items.push(p);brands.set(key,list)}}
 function write(path,title,description,body){fs.mkdirSync('public/'+path.split('/').slice(0,-1).join('/'),{recursive:true});fs.writeFileSync('public/'+path,renderPage({base,path,title,description,body}));paths.push(path)}
 for(const [kind,collection,label] of [['categories',groups,'Browse product types'],['brands',brands,'Browse grocery brands']]){
  const visible=[...collection].filter(([,g])=>g.items.length>=2).sort((a,b)=>a[1].label.localeCompare(b[1].label));
  write(kind+'.html',label,'Explore PricePine products by '+(kind==='brands'?'brand':'product type')+'.',`<h1>${label}</h1><p>Explore products and exact package sizes, then open a product to compare dated retailer prices.</p><ul>${visible.map(([key,g])=>`<li><a href="/${kind}/${key}/">${escapeHtml(g.label)}</a> (${g.items.length} products)</li>`).join('')}</ul><p><a href="/catalog/">Browse all products</a></p>`);
  for(const [key,g] of visible){const count=Math.ceil(g.items.length/100);for(let i=0;i<count;i++){
   const slug=key+(i?'-'+(i+1):'');
   const body=`<h1>${escapeHtml(g.label)}${i?' — page '+(i+1):''}</h1><p>Browse ${escapeHtml(g.label)} products and package sizes available in the PricePine catalog. Open a product for dated retailer observations and conditions.</p><ul>${g.items.slice(i*100,(i+1)*100).map(p=>`<li><a href="${productPath(p.id)}">${escapeHtml(p.name)}</a>${p.brand_name?' — '+escapeHtml(p.brand_name):''}</li>`).join('')}</ul><nav aria-label="Product pages">${Array.from({length:count},(_,n)=>`<a href="/${kind}/${key+(n?'-'+(n+1):'')}/" ${i===n?'aria-current="page"':''}>Page ${n+1}</a>`).join(' · ')}</nav><p><a href="/${kind}/">${label}</a> · <a href="/catalog/">All products</a></p>`;
   write(`${kind}/${slug}.html`,g.label+(i?' — page '+(i+1):''),`Browse ${g.label} products, exact sizes and retailer price comparisons on PricePine Canada.`,body);
  }}
 }
 for(const kind of ['categories','brands'])if(fs.existsSync('public/'+kind))for(const name of fs.readdirSync('public/'+kind))if(name.endsWith('.html')&&!paths.includes(kind+'/'+name))fs.unlinkSync('public/'+kind+'/'+name);
 return {paths,groups,brands};
}
