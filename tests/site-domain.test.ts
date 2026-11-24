import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// @ts-ignore Build-time ES module.
import {verificationMarkup,adsTxt} from '../scripts/site-verification.mjs';
test('all generated indexing signals use pricepine.ca',()=>{
 const index=fs.readFileSync('index.html','utf8');
 assert.ok(index.includes('rel="canonical" href="https://pricepine.ca/"'));
 const schema=JSON.parse(index.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
 assert.equal(schema.url,'https://pricepine.ca/');
 assert.ok(!index.includes('bolt.host'));
 assert.ok(fs.readFileSync('public/robots.txt','utf8').includes('Sitemap: https://pricepine.ca/sitemap.xml'));
 const sitemap=fs.readFileSync('public/sitemap.xml','utf8');
 const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.ok(urls.length>600);assert.ok(urls.every(u=>u.startsWith('https://pricepine.ca/')));
});
test('verification accepts real identifiers without loading ad scripts',()=>{
 const env={ADSENSE_PUBLISHER_ID:'ca-pub-1234567890123456',GOOGLE_SITE_VERIFICATION:'abc_DEF-123'};
 assert.ok(verificationMarkup(env).includes('google-adsense-account'));
 assert.ok(!verificationMarkup(env).includes('<script'));
 assert.equal(adsTxt(env),'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
 assert.throws(()=>verificationMarkup({GOOGLE_SITE_VERIFICATION:'\"><script>'}));
 assert.throws(()=>adsTxt({ADSENSE_PUBLISHER_ID:'ca-pub-example'}));
 assert.ok(!adsTxt({}).includes('pub-'));
});

test('a verification-only account adds the meta tag without activating an ad seller',()=>{
 const env={ADSENSE_VERIFICATION_ACCOUNT:'ca-pub-3805697991276218'};
 assert.equal(verificationMarkup(env),'<!-- site-verification:start --><meta name="google-adsense-account" content="ca-pub-3805697991276218"><!-- site-verification:end -->');
 assert.equal(adsTxt(env),'# No advertising sellers are authorized yet.\n');
 assert.throws(()=>verificationMarkup({ADSENSE_VERIFICATION_ACCOUNT:'invalid'}));
});
