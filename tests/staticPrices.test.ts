import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderObservations, packageMeasure } from '../scripts/render-observations.mjs';
import { unitPrice } from '../src/lib/domain.ts';
import { cadAmount, websiteState } from '../src/lib/catalogPrices.ts';
import { productPath } from '../src/lib/productSeo.ts';
const variant={id:'six',name:'6 x 100 ml',quantity:100,unit:'ml'};
const row={variant_id:'six',price_cad:3,package_size:variant.name,product_url:'https://www.gianttiger.com/products/test',retailer:'Giant Tiger',currency:'CAD',observed_at:'2026-11-24T14:00:00Z',check_status:'verified'};
const now=Date.parse('2026-11-24T15:00:00Z');
const helpers={unitPrice,cadAmount,websiteState};
test('public snapshots show dated exact-package (including multipack) prices, not inferred branch offers',()=>{
 const out=renderObservations(variant,[row,{...row,variant_id:'single',price_cad:1.99},{...row,retailer:'Future',observed_at:'2026-12-01T12:00:00Z'}],helpers,now);
 assert.match(out,/\$5\.00\s*\/ L/);assert.match(out,/\$3\.00/);assert.match(out,/2026-11-24T14:00:00.000Z/);
 assert.match(out,/branch price and stock unverified/i);assert.doesNotMatch(out,/Future|1\.99/);
});
test('unparsed units never assume a size and old or unconfirmed checks are described honestly',()=>{
 assert.equal(packageMeasure(variant,'Family bundle'),null);
 const out=renderObservations(variant,[{...row,package_size:'Family bundle',check_status:'source_unavailable'}],helpers,now);
 assert.match(out,/Not available/); assert.match(out,/Latest check unconfirmed/);
 assert.match(renderObservations(variant,[row],helpers,now+3*86400000),/Older observation/);
 assert.equal(renderObservations(variant,[{...row,currency:'USD'}],helpers,now),'');
});
test('home crawlable navigation is present before React with slashless directory destinations',()=>{
 assert.match(fs.readFileSync('index.html','utf8'),/<main[^>]*><h1>Compare Canadian grocery prices<\/h1>/);
 for(const p of ['categories','brands','catalog','about'])assert.match(fs.readFileSync('index.html','utf8'),new RegExp('href="/'+p+'"'));
 assert.equal(productPath('exact-package'),'/products/exact-package');
});
// Publication colors must not change catalog membership, aliases or sitemap URLs.
test('price refresh preserves all canonical IDs from the committed catalog identity rules', async()=>{
 if(!fs.existsSync('public/product-page-ids.json'))return;
 const {validDiscovery,mergeDiscovered}=await import('../src/lib/discoveryFeed.ts');
 const read=(name:string)=>JSON.parse(fs.readFileSync('public/'+name,'utf8'));
 const baseline=mergeDiscovered(read('catalog-snapshot.json'),validDiscovery(read('discovered-catalog.json'))).products.map(p=>p.id);
 assert.deepEqual(read('product-page-ids.json'),baseline);
});
