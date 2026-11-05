import test from 'node:test';import assert from 'node:assert/strict';
import {validDiscovery,mergeDiscovered} from '../src/lib/discoveryFeed.ts';
const r={name:'Beans',brand:'Brand',package_size:'500 g',retailer:'No Frills',retailer_sku:'123_EA',product_url:'https://www.nofrills.ca/en/beans/p/123_EA',currency:'CAD',price_cad:2,observed_at:'2026-01-01T00:00:00Z'};
const p={id:'discovered-0123456789abcdef01234567',name:r.name,brand:r.brand,package_size:r.package_size,observations:[r]};
const catalog={products:[{id:'db-product',name:'Beans',brand_id:'b',source_url:'https://www.realcanadiansuperstore.ca/en/beans/p/123_EA'}],product_variants:[{id:'db-variant',product_id:'db-product',name:'500 g'}],brands:[{id:'b',name:'Brand'}]};
test('existing database product reused and new retailer attached',()=>{const c=mergeDiscovered(catalog,[p]);assert.equal(c.products.length,1);assert.equal(c.retail_price_observations[0].variant_id,'db-variant');assert.equal(catalog.products.length,1)});
test('duplicate feed does not create duplicate cards or observations',()=>{const c=mergeDiscovered({},[p,p]);assert.equal(c.products.length,1);assert.equal(c.product_variants.length,1);assert.equal(c.retail_price_observations.length,1)});
test('different sizes remain distinct',()=>{const c=mergeDiscovered(catalog,[{...p,package_size:'1 kg',observations:[{...r,package_size:'1 kg'}]}]);assert.equal(c.products.length,2)});
test('reject bad host, future timestamp, mismatched size, missing price',()=>{for(const patch of [{product_url:'https://evil.example/p/123_EA'},{observed_at:'2099-01-01'},{package_size:'1 kg'},{price_cad:null}])assert.equal(validDiscovery({products:[{...p,observations:[{...r,...patch}]}]}).length,0);assert.equal(validDiscovery({products:[p]}).length,1)});
test('database price more recent than discovered price wins',()=>{const c=mergeDiscovered({...catalog,retail_price_observations:[{...r,price_cad:5,variant_id:'db-variant',observed_at:'2026-02-01'}]},[p]);assert.equal(c.retail_price_observations[0].price_cad,5)});

test('merged feed identities keep working product-page aliases',()=>{const other={...p,id:'discovered-abcdef0123456789abcdef01'};const c=mergeDiscovered(catalog,[p,other]);assert.equal(c.products.length,1);assert.deepEqual(c.products[0].feed_aliases,[p.id,other.id]);assert.equal(c.products[0].feed_id,p.id)});
