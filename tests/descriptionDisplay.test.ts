import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { applyDescriptions, publicProductDescription } from '../src/lib/productSeo.ts';
const name='Apple Juice';
const package_size='2 L';
const description='Apple Juice. Listed package: 2 L. Retailer overview: “The most delicious choice ever.”';
const entry={name,package_size,description,source_label:'No Frills',source_url:'https://www.nofrills.ca/en/apple-juice/p/123_EA',checked_at:'2026-11-23T12:00:00Z'};
test('catalog display keeps the package/source/date but not retailer marketing',()=>{
 const p=applyDescriptions({products:[{id:'id',name}]},{entries:{id:entry}}).products[0];
 assert.equal(p.description,'Apple Juice. Listed package: 2 L. Compare dated retailer prices where available.');
 assert.equal(p.description_source,entry.source_url);assert.equal(p.description_checked_at,entry.checked_at);assert.equal(entry.description,description);
 assert.doesNotMatch(publicProductDescription('Retailer overview: “copy”','Apple Juice, 2 L','2 L'),/copy|Listed package/);
});
test('runtime source refresh applies the same text to body, metadata and Product schema',async()=>{
 const text={textContent:''};const meta:string[]=[];
 const product={textContent:'{"@type":"Product"}'};const crumbs={textContent:'{"@type":"BreadcrumbList"}'};
 let attribution:any;
 const root={dataset:{descriptionIds:'id',productName:name},querySelector:(s:string)=>s.includes('text')?text:{replaceChildren:(...args:any[])=>{attribution=args}}};
 const document={querySelector:(s:string)=>s.startsWith('meta')?{setAttribute:(_k:string,v:string)=>meta.push(v)}:root,querySelectorAll:()=>[product,crumbs],createElement:()=>({}),createTextNode:(s:string)=>s};
 vm.runInNewContext(readFileSync('public/product-description.js','utf8'),{document,fetch:async()=>({ok:true,json:async()=>entry}),AbortSignal,URL,Date});
 await new Promise(resolve=>setImmediate(resolve));
 const safe=publicProductDescription(description,name,package_size);
 assert.equal(text.textContent,safe);assert.deepEqual(meta,[safe,safe,safe]);assert.equal(JSON.parse(product.textContent).description,safe);
 assert.equal(crumbs.textContent,'{"@type":"BreadcrumbList"}');
 assert.equal(attribution[0].href,entry.source_url);assert.match(attribution[1],/Checked/);
});
