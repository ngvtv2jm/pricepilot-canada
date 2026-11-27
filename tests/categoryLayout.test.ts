import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const read=(path:string)=>fs.readFileSync(path,'utf8');
test('each sitemap category route including pagination has local image fallback, canonical and internal shopping links',()=>{
 const paths=[...read('public/sitemap.xml').matchAll(/<loc>https:\/\/pricepine.ca\/(categories(?:\/[^<]+)?)<\/loc>/g)].map(x=>x[1]);
 assert.ok(paths.length>=40);assert.ok(paths.includes('categories'));assert.ok(paths.includes('categories/bread-2'));
 for(const path of paths){
  const html=read('public/'+path+'.html');
  assert.match(html,/<img class="category-fallback" src="\/category-fallback.svg"/,path);
  assert.match(html,/aria-label="Category breadcrumb"/,path);
  assert.match(html,/class="category-grid"/,path);
  assert.ok(html.includes('rel="canonical" href="https://pricepine.ca/'+path+'"'),path);
  const photo=html.match(/class="category-photo"[^>]*src="([^"]+)"/)?.[1];
  if(photo){
   assert.match(photo,/^https:\/\/raw\.githubusercontent\.com\/ngvtv2jm\/pricepilot-canada\/main\/public\/(?:catalog-cache|catalog-images)\/.+\.webp$/);

  }
  const expected=path==='categories'?'/pricepine-social-card.png':'/social/v1/'+path.split('/')[1].replace(/-\d+$/,'')+'.png';
  assert.ok(html.includes('property="og:image" content="https://pricepine.ca'+expected+'"'),path);
  assert.ok(fs.existsSync('public'+expected),path);
 }
 assert.match(read('public/categories/bread-2.html'),/href="\/categories\/bread-2" aria-current="page"/);
 assert.match(read('public/category-view.css'),/@media\(max-width:640px\).*grid-template-columns:1fr/);
});
test('a failed featured image leaves the local artwork visible and removes its misleading caption',()=>{
 const listeners:Record<string,()=>void>={};
 const caption={hidden:false};const active=new Set<string>();
 const art={classList:{add:(x:string)=>active.add(x),remove:(x:string)=>active.delete(x)},querySelector:()=>caption};
 const photo={complete:false,naturalWidth:300,hidden:false,closest:()=>art,addEventListener:(s:string,f:()=>void)=>{listeners[s]=f}};
 vm.runInNewContext(read('public/category-view.js'),{document:{querySelectorAll:()=>[photo]}});
 listeners.load();assert.ok(active.has('category-photo-ready'));listeners.error();
 assert.equal(photo.hidden,true);assert.equal(caption.hidden,true);assert.equal(active.size,0);
});
