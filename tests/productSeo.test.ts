import test from 'node:test';import assert from 'node:assert/strict';
import {productGroup,seoIndex,relatedProducts,applyDescriptions,brandPath} from '../src/lib/productSeo.ts';
test('related products favour the product type and exclude self, alias and brand-only matches',()=>{
 const products=[{id:'milk',name:'Chocolate Milk',brand_name:'Brand'},{id:'plain',name:'Whole Milk',brand_name:'Other'},{id:'candy',name:'Milk Chocolate Bar',brand_name:'Brand'},{id:'soap',name:'Hand Soap',brand_name:'Brand'},{id:'alias',name:'Chocolate Milk',feed_aliases:['milk']}];
 assert.deepEqual(relatedProducts(products[0],seoIndex(products)).map(p=>p.id),['plain']);
 assert.equal(productGroup({name:'Peanut Butter'})?.[0],'nut-spreads');assert.equal(productGroup({name:'Salted Butter'})?.[0],'butter');assert.equal(productGroup({name:'Chocolate Chip Granola Bars'})?.[0],'bars');assert.equal(brandPath("President's Choice"),'/brands/president-s-choice');
});
test('unrelated unknown products are not used to fill recommendations',()=>{const products=[{id:'1',name:'Festival Kit',brand_name:'Acme'},{id:'2',name:'Hand Soap',brand_name:'Acme'}];assert.equal(relatedProducts(products[0],seoIndex(products)).length,0)});
test('description feed validates identity, timestamp and source before replacing catalog text',()=>{
 const p={id:'old',name:'Chocolate Milk',description:'Manual description',feed_id:'new'};const entry={name:p.name,description:'Chocolate Milk. Listed package: 2 L. Retailer overview: A chocolate milk beverage in a resealable container.',source_url:'https://www.nofrills.ca/en/chocolate-milk/p/123_EA',checked_at:'2026-01-01T00:00:00Z',source_label:'No Frills'};
 assert.equal(applyDescriptions({products:[p]},{entries:{new:entry}}).products[0].description,'Chocolate Milk. Listed package: 2 L. Compare dated retailer prices where available.');assert.equal(p.description,'Manual description');
 for(const change of [{name:'Strawberry Milk'},{source_url:'https://example.com/product'},{checked_at:'2999-01-01'}])assert.equal(applyDescriptions({products:[p]},{entries:{new:{...entry,...change}}}).products[0],p);
});
