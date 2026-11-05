import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {escapeHtml,jsonLd,httpsUrl,renderPage} from '../scripts/trust-pages.mjs';
test('public content escapes markup, unsafe schemes and JSON-LD terminators',()=>{
 assert.equal(escapeHtml('<img src=x onerror="bad">'),'&lt;img src=x onerror=&quot;bad&quot;&gt;');
 assert.equal(httpsUrl('javascript:alert(1)'),'');assert.equal(httpsUrl('https://user:password@example.com'),'');
 assert.ok(!jsonLd({name:'</script><script>alert(1)</script>'}).includes('<'));
 const page=renderPage({base:'https://example.com',path:'example.html',title:'<img src=x>',description:'" test',body:'<h1>Example</h1>'});assert.ok(!page.includes('<title><img'));
});
test('every canonical product snapshot is complete and sitemap preserves database products without credentials',()=>{
 const sitemap=fs.readFileSync('public/sitemap.xml','utf8');const paths=[...sitemap.matchAll(/<loc>https:\/\/pricepilot-canada-0s3l.bolt.host\/([^<]+)<\/loc>/g)].map(m=>m[1]);
 const products=paths.filter(p=>p.startsWith('products/'));assert.ok(products.length>=600);
 for(const p of paths){assert.ok(fs.existsSync('public/'+p),p);const html=fs.readFileSync('public/'+p,'utf8');assert.equal((html.match(/<h1[ >]/g)||[]).length,1,p);assert.ok(html.includes('rel="canonical"'),p);assert.ok(html.includes('name="twitter:image"'),p);assert.ok(html.includes('property="og:description"'),p);assert.ok(!html.includes('content="noindex'),p);}
 for(const p of products){const html=fs.readFileSync('public/'+p,'utf8');const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);assert.equal(schema['@type'],'Product');assert.ok(schema.image.startsWith('https://'));assert.ok(!schema.offers,'No unverified offers are marked up');}
});
test('canonical product identities and alias pages do not compete in sitemap',()=>{
 const sitemap=fs.readFileSync('public/sitemap.xml','utf8');const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);assert.equal(urls.length,new Set(urls).size);
 for(const name of fs.readdirSync('public/products')){const html=fs.readFileSync('public/products/'+name,'utf8');if(html.includes('content="noindex,follow"'))assert.ok(!urls.some(u=>u.endsWith('/'+name)),name);}
});
test('all policy pages are public, versioned and linked from the footer',()=>{
 for(const slug of ['about','privacy','terms','contact','cookies','disclaimer','accessibility']){const html=fs.readFileSync('public/'+slug+'.html','utf8');assert.ok(html.includes('Version 1'));assert.ok(html.includes('Updated <time'));assert.ok(html.includes('href="/privacy.html"'));assert.ok(html.includes('href="/contact.html"'));}
});
