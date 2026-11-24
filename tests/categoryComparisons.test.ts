import test from 'node:test';
import assert from 'node:assert/strict';
import {cadAmount,websiteState} from '../src/lib/catalogPrices.ts';
// @ts-ignore Production static generator is a native ES module.
import {recentCategoryMatches,stapleMatch} from '../scripts/product-navigation.mjs';
import {productGroup} from '../src/lib/productSeo.ts';

test('category comparison ranges use distinct retailers, identical sizes and recent verified CAD observations',()=>{
 const publishTime=Date.parse('2026-11-24T17:00:00Z');
 const row=(retailer:string,size:string,price:number)=>({retailer,package_size:size,price_cad:price,observed_at:'2026-11-24T15:00:00Z',check_status:'verified',product_url:'https://example.com/milk',currency:'CAD'});
 const source=[
  row('Retailer A','2 L',4),row('Retailer B','2l',5),row('Retailer D','4 L',7),
  {...row('Retailer C','2 L',1),check_status:'unconfirmed'},
  {...row('Retailer E','2 L',2),observed_at:'2026-11-20T15:00:00Z'},
  {...row('Retailer B','2 L',6),observed_at:'2026-11-24T14:00:00Z'},
  {...row('Retailer F','2 L',3),currency:'USD'},
  row('Retailer G','',2),{...row('Retailer H','2 L',2),product_url:'http://example.com/milk'},
 ];
 const matches=recentCategoryMatches([{id:'milk',name:'Milk'}],{variantsByProduct:new Map([['milk',[{id:'p'}]]]),observations:new Map([['p',source]]),helpers:{cadAmount,websiteState},publishTime});
 assert.equal(matches.length,1);
 assert.deepEqual([matches[0].count,matches[0].low.price_cad,matches[0].high.price_cad],[2,4,5]);
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
});
