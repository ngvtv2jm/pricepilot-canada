import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:4173';
for(let i=0;i<40;i++){try{if((await fetch(origin)).ok)break}catch{}if(i===39)throw Error('Preview server did not start');await new Promise(resolve=>setTimeout(resolve,250));}
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];
await context.route('https://raw.githubusercontent.com/ngvtv2jm/pricepilot-canada/main/public/**',async route=>{
 const pathname=new URL(route.request().url()).pathname;const relative=pathname.split('/main/')[1];
 if(!relative||relative.includes('..'))return route.abort();
 if(fs.existsSync(relative)&&fs.statSync(relative).isFile())return route.fulfill({body:fs.readFileSync(relative),contentType:relative.endsWith('.json')?'application/json':relative.endsWith('.webp')?'image/webp':'text/plain'});
 return route.fulfill({status:404,body:'Not found'});
});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
fs.mkdirSync('outputs/homepage-qa',{recursive:true});
try{
 await page.goto(origin);
 await page.getByRole('heading',{name:'Compare Canadian grocery prices',exact:true}).waitFor();
 assert.equal(await page.title(),'PricePine Canada — Compare Canadian grocery prices');
 assert.equal(await page.locator('meta[name=description]').getAttribute('content'),await page.locator('meta[property="og:description"]').getAttribute('content'));
 await page.locator('.home-product').first().waitFor();
 await page.waitForFunction(()=>document.querySelector('.home-product-image img')?.naturalWidth>0);
 assert.ok(await page.locator('.home-categories>a').count()>=4);
 assert.ok(await page.locator('.home-product').count()>=8);
 await page.getByRole('button',{name:'Breakfast essentials',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Breakfast essentials',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'All picks',exact:true}).click();
 await page.screenshot({path:'outputs/homepage-qa/home-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Milk',exact:true}).click();
 await page.getByRole('heading',{name:'Find your everyday essentials.'}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'Search products, brands or barcodes'}).inputValue(),'Milk');
 await page.getByRole('button',{name:/Price Pine/}).click();
 await page.locator('.home-product-link').first().click();
 await page.locator('.detail h1').waitFor();
 assert.ok(Object.keys(JSON.parse(await page.evaluate(()=>localStorage.getItem('pricepine-product-activity-v1')))).length>0);
 await page.getByRole('button',{name:/Price Pine/}).click();
 await page.getByText('1 view on this device',{exact:true}).first().waitFor();
 await page.locator('.home-categories>a').first().click();
 await page.locator('.home-category-selection').waitFor();
 await page.getByRole('button',{name:/Price Pine/}).click();
 await page.setViewportSize({width:375,height:812});
 await page.screenshot({path:'outputs/homepage-qa/home-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 assert.equal(await page.getByRole('button',{name:'Toggle navigation'}).isVisible(),true);
 for(const slug of ['contact','cookies','privacy','terms','about','accessibility','disclaimer']){
  await page.goto(origin+'/'+slug+'.html');
  await page.waitForURL(origin+'/'+slug);
  await page.reload();
  assert.equal(await page.locator('main h1').count(),1);
  assert.ok(!page.url().includes('.html'));
 }
 const id=JSON.parse(fs.readFileSync('public/product-page-ids.json','utf8'))[0];
 await page.goto(origin+'/products/'+id+'.html');
 await page.waitForURL(origin+'/products/'+id);await page.reload();
 assert.equal(await page.locator('[data-product-description]').count(),1);
 assert.deepEqual(errors,[]);
 console.log('Homepage desktop/mobile, collections, category filtering, product history, legacy policy URLs and product refresh passed.');
}finally{await browser.close()}
