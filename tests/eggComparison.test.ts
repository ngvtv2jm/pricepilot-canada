import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cadAmount,websiteState} from '../src/lib/catalogPrices.ts';
// @ts-ignore Native build module.
import {confirmedDozenEggs,dozenEggObservations,renderDozenEggComparison,eggsDescription} from '../scripts/egg-comparison.mjs';
const product={id:'eggs',name:'Grade A Large White Eggs',brand_name:'Test Farm'};
const variant={id:'carton',name:'12 ea',quantity:12,unit:'each',attributes:{}};
const now=Date.parse('2026-11-25T17:00:00Z');
const row=(extra={})=>({variant_id:'carton',name:product.name,package_size:'12 ea',retailer:'Test store',price_cad:3.93,currency:'CAD',check_status:'verified',observed_at:'2026-11-25T02:00:00Z',product_url:'https://example.com/eggs',...extra});
const options=(rows:any[])=>({variantsByProduct:new Map([['eggs',[variant]]]),observations:new Map([['carton',rows]]),helpers:{cadAmount,websiteState},publishTime:now});
test('dozen comparison requires explicit large Grade A details and matching counts',()=>{
 assert.equal(confirmedDozenEggs(product,variant,row()),true);
 for(const name of ['Large White Eggs','Grade A Medium Eggs','Grade A Extra-Large Eggs','Grade A Organic Large Eggs','Grade A Free‑Run Large Eggs','Grade A Free Range Large Eggs','Grade A Omega 3 Large Eggs','Grade A Large Eggs 18 Pack','Grade A Large Eggs 6 count','Grade A Large Egg Whites'])assert.equal(confirmedDozenEggs({...product,name},variant,row({name})),false,name);
 for(const size of ['6 ea','18 ea','15x12.0 ea','2 x 6 eggs','12 g',''])assert.equal(confirmedDozenEggs(product,variant,row({package_size:size})),false,size);
 assert.equal(confirmedDozenEggs(product,{...variant,quantity:18},row()),false);
 assert.equal(confirmedDozenEggs(product,{...variant,name:'18 ea'},row()),false);
 assert.equal(confirmedDozenEggs(product,variant,row({name:'Grade B Large Eggs'})),false);
 assert.equal(confirmedDozenEggs({...product,name:'Large White Eggs'},{...variant,attributes:{grade:'A'}},row({name:'Large White Eggs'})),true);
});
test('only valid CAD source observations are shown, with newest per exact package and retailer',()=>{
 const records=dozenEggObservations([product],options([row(),row({price_cad:9,observed_at:'2026-11-24T01:00:00Z'}),row({retailer:'Other store',price_cad:4}),row({retailer:'USD',currency:'USD'}),row({retailer:'Future',observed_at:'2026-12-01T00:00:00Z'}),row({retailer:'Invalid date',observed_at:'wrong'}),row({retailer:'Unconfirmed',check_status:'needs_review'}),row({retailer:'Unsafe',product_url:'javascript:alert(1)'}),row({retailer:'Invalid price',price_cad:'NaN'}),row({retailer:'Wrong variant',variant_id:'other'})]));
 assert.equal(records.length,2);
 assert.equal(records.find((r:any)=>r.row.retailer==='Test store').perEgg,3.93/12);
});
test('CAD carton and per-egg formatting and Eastern date are readable in initial HTML',()=>{
 const html=renderDozenEggComparison([product],options([row(),row({retailer:'Other store',price_cad:4})]));
 for(const text of ['$3.93 CAD','$0.3275 CAD','$4.00 CAD','$0.3333 CAD','Nov 24, 2026','ET','https://example.com/eggs','Test Farm Grade A Large White Eggs'])assert.ok(html.includes(text),text);
 assert.match(html,/datetime="2026-11-25T02:00:00.000Z"/);
 assert.match(html,/not guaranteed local prices or stock/);
 assert.match(html,/no cheapest retailer is declared/);
 const older=renderDozenEggComparison([product],options([row({observed_at:'2026-11-01T01:00:00Z'})]));
 assert.match(older,/Older observation/);assert.match(older,/1 dated observation shown/);
});
test('empty and single observations do not produce an invented cheapest retailer or price',()=>{
 const empty=renderDozenEggComparison([product],options([]));
 assert.match(empty,/No confirmed matching online price observations/);assert.doesNotMatch(empty,/class="egg-observation"|\$\d/);
 const one=renderDozenEggComparison([product],options([row()]));
 assert.equal((one.match(/class="egg-observation"/g)||[]).length,1);assert.match(one,/no cheapest retailer is declared/);
 const escaped=renderDozenEggComparison([{...product,name:product.name+' <script>x</script>'}],options([row({retailer:'A&B'})]));
 assert.match(escaped,/A&amp;B/);assert.doesNotMatch(escaped,/<script>x/);
});
test('eggs page preserves indexing identity and renders comparison immediately after H1 only on eggs',()=>{
 const html=fs.readFileSync('public/categories/eggs.html','utf8');
 assert.match(html,/<title>Compare egg prices in Canada \| PricePine Canada<\/title>/);
 assert.match(html,/<h1>Compare egg prices in Canada<\/h1><section class="egg-comparison"/);
 assert.ok(html.includes('<meta name="description" content="'+eggsDescription+'">'));
 assert.match(html,/rel="canonical" href="https:\/\/pricepine.ca\/categories\/eggs"/);
 assert.match(html,/<meta name="robots" content="index,follow">/);
 assert.ok(fs.readFileSync('public/sitemap.xml','utf8').includes('<loc>https://pricepine.ca/categories/eggs</loc>'));
 for(const category of ['milk','coffee','bread','pasta'])assert.doesNotMatch(fs.readFileSync('public/categories/'+category+'.html','utf8'),/egg-comparison|id="dozen-eggs"/);
});
test('exact SKU grade evidence ignores generic descriptions but not conflicting product facts',()=>{
 const exact={...product,id:'discovered-700933cc7c400089523a1034',brand_name:'No Name',name:'Large Size Eggs 12 Pack',description:'For breakfast. Eggs also come in medium and extra-large.'};
 const actual=row({name:exact.name,brand:'No Name',retailer:'Loblaws',retailer_sku:'20812144001_EA',product_url:'https://www.loblaws.ca/en/large-size-eggs-12-pack/p/20812144001_EA',description:'Make breakfast.'});
 assert.equal(confirmedDozenEggs(exact,variant,actual),true);
 assert.equal(confirmedDozenEggs(exact,variant,{...actual,retailer_sku:'other'}),false);
 assert.equal(confirmedDozenEggs({...exact,name:'Free Run Large Size Eggs 12 Pack'},variant,actual),false);
 assert.equal(confirmedDozenEggs({...exact,id:'different'},variant,actual),false);
 assert.equal(confirmedDozenEggs(exact,{...variant,attributes:{grade:'B'}},actual),false);
});
test('previously verified feed rows survive a failed latest check without becoming current prices',()=>{
 const exact={...product,id:'discovered-700933cc7c400089523a1034',brand_name:'No Name',name:'Large Size Eggs 12 Pack'};
 const actual=row({name:exact.name,brand:'No Name',retailer:'Loblaws',retailer_sku:'20812144001_EA',product_url:'https://www.loblaws.ca/en/large-size-eggs-12-pack/p/20812144001_EA',price_cad:5});
 const opts={...options([]),variantsByProduct:new Map([[exact.id,[variant]]])};
 opts.observations.set(variant.id,[{...actual,check_status:'source_unavailable'}]);
 const archived=renderDozenEggComparison([exact],opts);
 assert.match(archived,/Last verified price in the archive. Not a current price/);
 assert.match(archived,/Nov 22, 2026/);
 assert.match(archived,/Loblaws/);assert.match(archived,/No Frills/);
 assert.match(archived,/Confirm the No Name carton size and grade/);
 assert.doesNotMatch(archived,/\$5\.00/);
 opts.observations.set(variant.id,[actual]);
 const updated=dozenEggObservations([exact],opts);
 assert.equal(updated.length,2);
 assert.equal(updated.find((x:any)=>x.row.retailer==='Loblaws').amount,5);
 assert.equal(updated.find((x:any)=>x.row.retailer==='Loblaws').older,false);
 opts.variantsByProduct.set(exact.id,[variant,{...variant,id:'another-dozen'}]);
 assert.equal(dozenEggObservations([exact],opts).length,1);
});
test('production egg HTML includes source-backed observation dates and no current-price claim',()=>{
 const html=fs.readFileSync('public/categories/eggs.html','utf8');
 assert.match(html,/class="egg-observation"/);
 assert.match(html,/<time datetime="[^"]+">/);
 assert.match(html,/Price per egg/);
 assert.match(html,/not guaranteed local prices or stock/);
});
