import test from 'node:test';
import assert from 'node:assert/strict';
import {cadAmount,websiteState} from '../src/lib/catalogPrices.ts';
import {unitPrice} from '../src/lib/domain.ts';
// @ts-ignore Production static generator is a native ES module.
import {stapleMatch} from '../scripts/product-navigation.mjs';
// @ts-ignore Production static generator is a native ES module.
import {selectCategoryComparisons,renderCategoryComparison} from '../scripts/category-comparison.mjs';
import {productGroup} from '../src/lib/productSeo.ts';
import fs from 'node:fs';

const product={id:'milk',name:'Milk',brand_name:'Test Dairy'};
const publishTime=Date.parse('2026-11-24T17:00:00Z');
const row=(retailer:string,size:string,price:number)=>({product_id:'milk',variant_id:'p',retailer,package_size:size,price_cad:price,observed_at:'2026-11-24T15:00:00Z',check_status:'verified',product_url:'https://example.com/milk',currency:'CAD'});
function opts(source:ReturnType<typeof row>[]){
 return {variantsByProduct:new Map([['milk',[{id:'p'}]]]),observations:new Map([['p',source]]),helpers:{cadAmount,websiteState,unitPrice},publishTime};
}
const url=(id:string)=>'/products/'+id;

test('category comparisons isolate exact variants and sizes, deduplicate retailers and keep verified historical prices',()=>{
 const source=[
  row('Retailer A','2 L',4),row('Retailer B','2l',5),row('Retailer D','4 L',7),
  {...row('Retailer C','2 L',1),check_status:'unconfirmed'},
  {...row('Retailer E','2 L',2),observed_at:'2026-11-20T15:00:00Z'},
  {...row(' retailer b ','2 L',6),observed_at:'2026-11-24T14:00:00Z'},
  {...row('Retailer F','2 L',3),currency:'USD'},
  row('Retailer G','',2),{...row('Retailer H','2 L',2),product_url:'http://example.com/milk'},
  {...row('Retailer I','2 L',1),variant_id:'other'},
  {...row('Retailer J','2 L',1),product_id:'other'},
  {...row('Retailer K','2 L',2),observed_at:'2026-11-25T15:00:00Z'},
 ];
 const o=opts(source);
 const matches=selectCategoryComparisons([product],o);
 assert.equal(matches.length,1);
 assert.deepEqual(matches[0].rows.map((x:any)=>[x.retailer,x.amount,x.state]),[['Retailer A',4,'current'],['Retailer B',5,'current'],['Retailer E',2,'old']]);
 const markup=renderCategoryComparison([product],o,url);
 assert.match(markup,/Historical observation, not a current price/);
 assert.match(markup,/\$2\.00 \/ L/);
 assert.match(markup,/<time datetime="2026-11-20T15:00:00.000Z"/);
 assert.match(markup,/https:\/\/example\.com\/milk/);
 assert.doesNotMatch(markup,/cheapest/i);
});

test('a single retailer and missing data display honest fallback states',()=>{
 assert.match(renderCategoryComparison([product],opts([row('Only retailer','2 L',4)]),url),/Only one verified retailer observation/);
 assert.match(renderCategoryComparison([product],opts([row('Only retailer','standard',4)]),url),/No verified online prices/);
});

test('the initial HTML has a comparison on every category route, preserving the special Eggs page',()=>{
 const sitemap=fs.readFileSync('public/sitemap.xml','utf8');
 const slugs=[...sitemap.matchAll(/<loc>https:\/\/pricepine\.ca\/categories\/([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.ok(slugs.length>=47);
 for(const slug of slugs){
  const page=fs.readFileSync('public/categories/'+slug+'.html','utf8');
  assert.match(page,slug==='eggs'?/id="dozen-eggs"/:/id="matching-packages"/,slug);
  if(slug!=='eggs')assert.match(page,/class="category-price(?:-empty)?"/,slug);
 }
});

test('confectionery eggs are not classified as grocery eggs',()=>{
 assert.equal(productGroup({name:'Kinder Bueno Eggs'})?.[0],'candy');
 assert.equal(productGroup({name:'Large White Eggs'})?.[0],'eggs');
});

test('lead staples distinguish ingredients from meals, snacks and condiments',()=>{
 assert.equal(stapleMatch('eggs', "Breakfast Steak 'N Eggs"),false);
 assert.equal(stapleMatch('eggs','Free-Run Large Size White Eggs 12 Pack'),true);
 assert.equal(stapleMatch('coffee','Coffee Crisp Wafer Bar'),false);
 assert.equal(stapleMatch('coffee','Coffee Mate Original Powder'),false);
 assert.equal(stapleMatch('coffee','COFFEE-MATE Original Powder'),false);
 assert.equal(stapleMatch('coffee','No Name Coffee Whitener'),false);
 assert.equal(stapleMatch('coffee','Ground Coffee Original Roast'),true);
 assert.equal(stapleMatch('pasta','Pasta Topping Seasoning'),false);
 assert.equal(stapleMatch('pasta','Pasta Sauce Mix Carbonara'),false);
 assert.equal(stapleMatch('bread','Tortilla Chips'),false);
 assert.equal(stapleMatch('rice','Rice Krispies Cereal'),false);
 assert.equal(stapleMatch('rice','Brown Rice Fusilli'),false);
 assert.equal(stapleMatch('rice','Ready to Heat Jasmine Rice'),true);
 assert.equal(stapleMatch('nut-spreads','Peanut Butter Swirl Ice Cream'),false);
 assert.equal(stapleMatch('nut-spreads','Peanut Butter Delights'),false);
 assert.equal(stapleMatch('nut-spreads','Kraft Smooth Peanut Butter'),true);
});
