import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {renderDozenEggComparison} from '../scripts/egg-comparison.mjs';
import {renderPage} from '../scripts/trust-pages.mjs';
const origin='http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:process.env.PRICEPINE_TEST_CHROMIUM||undefined});
const page=await browser.newPage();
const product={id:'test',name:'Grade A Large White Eggs',brand_name:'Fixture Farm'};
const variant={id:'carton',name:'12 ea',quantity:12,unit:'each'};
const now=Date.parse('2026-11-25T17:00:00Z');
const records=['Fixture retailer A','Fixture retailer with a longer name B'].map(retailer=>({retailer,variant_id:'carton',name:product.name,package_size:'12 ea',price_cad:3.93,currency:'CAD',check_status:'verified',observed_at:'2026-11-25T02:00:00Z',product_url:'https://example.com/eggs'}));
const options={variantsByProduct:new Map([['test',[variant]]]),observations:new Map([['carton',records]]),helpers:{cadAmount:v=>Number(v),websiteState:()=> 'current'},publishTime:now};
const fixture=renderPage({base:origin,path:'__eggs-test.html',title:'Egg comparison layout fixture',description:'Test only',body:'<link rel="stylesheet" href="/category-view.css"><link rel="stylesheet" href="/egg-comparison.css"><div class="category-view"><section class="category-hero"><div class="category-copy"><h1>Egg comparison layout fixture</h1>'+renderDozenEggComparison([product],options)+'</div></section></div>'});
await page.route(origin+'/__eggs-test',route=>route.fulfill({contentType:'text/html',body:fixture}));
fs.mkdirSync('outputs/eggs-qa',{recursive:true});
try{
 for(const width of [1440,375,320]){
  await page.setViewportSize({width,height:900});
  await page.goto(origin+'/categories/eggs');
  await page.locator('#dozen-eggs').waitFor();
  assert.equal(await page.locator('h1 + #dozen-eggs').count(),1);
  assert.ok(await page.locator('.egg-empty, .egg-observation').count()>0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'outputs/eggs-qa/eggs-'+width+'.png',fullPage:true});
  // Exercise populated layout even when the actual public feed has no confirmed dozen.
  await page.goto(origin+'/__eggs-test');
  assert.equal(await page.locator('.egg-observation').count(),2);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const source of await page.locator('.egg-source').all())assert.ok((await source.boundingBox()).height>=44);
  await page.screenshot({path:'outputs/eggs-qa/populated-'+width+'.png',fullPage:true});
 }
 console.log('Eggs initial HTML, empty/populated comparison and desktop/375px/320px layout passed.');
}finally{await browser.close()}
