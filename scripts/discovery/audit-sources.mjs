import {chromium} from 'playwright';
import fs from 'node:fs';
const sources=[['FreshCo','https://www.freshco.com/products/brand/FreshCo'],['Canadian Tire','https://www.canadiantire.ca/en/cat/home/snacks-beverages/pantry-DC0003120.html'],['Walmart','https://www.walmart.ca/en/cp/grocery/10019']];
const browser=await chromium.launch({headless:true,channel:'chrome'});const results=[];
for(const [retailer,url] of sources){
 const page=await browser.newPage();const samples=[];const pending=[];
 page.on('response',response=>{if(!/algolia\.net|canadiantire\.ca/.test(new URL(response.url()).hostname)||!response.headers()['content-type']?.includes('json'))return;pending.push((async()=>{try{const d=await response.json();function walk(v){if(!v||typeof v!=='object')return;if(Array.isArray(v.hits)&&v.hits.length)samples.push({host:new URL(response.url()).hostname,hits:v.hits.slice(0,2)});if(Array.isArray(v.products)&&v.products.length)samples.push({host:new URL(response.url()).hostname,products:v.products.slice(0,2)});if(samples.length<8)for(const c of Object.values(v))if(c&&typeof c==='object')walk(c)}walk(d)}catch{}})());});
 try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(12000);await Promise.allSettled(pending);results.push({retailer,url,title:await page.title(),text:(await page.locator('body').innerText()).slice(-18000),links:(await page.locator('a').evaluateAll(es=>es.map(e=>({text:e.textContent,href:e.href})).filter(e=>/\/product|\/pdp\//.test(e.href)))).slice(0,35),samples:samples.slice(0,5)});}catch(e){results.push({retailer,error:e.message.slice(0,200)})}await page.close();
}
await browser.close();fs.writeFileSync('public/source-audit.json',JSON.stringify({checked_at:new Date().toISOString(),results},null,2));console.log(results.map(r=>({retailer:r.retailer,title:r.title,samples:r.samples?.length,links:r.links?.length,error:r.error})));
