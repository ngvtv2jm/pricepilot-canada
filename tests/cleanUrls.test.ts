import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('public/clean-urls.js','utf8');
const oldHost='pricepilot-canada-0s3l.bolt.host';
function observe(pathname:string,search='',hash='',hostname='pricepine.ca'){
 const result:{history?:string,location?:string}={};
 vm.runInNewContext(code,{
  window:{location:{pathname,search,hash,hostname,replace:(url:string)=>result.location=url}},
  history:{state:{},replaceState:(_s:unknown,_t:string,url:string)=>result.history=url},
  URLSearchParams,
 });
 return result;
}

test('legacy policy, hub and product URLs normalize without losing the query or fragment',()=>{
 for(const pathname of ['/contact.html','/cookies.html','/products/test.html','/brands/test.html','/contact/']){
  assert.deepEqual(observe(pathname,'?source=test','#content'),{history:pathname.replace(/\.html$|\/$/,'')+'?source=test#content'});
 }
 assert.deepEqual(observe('/index.html'),{history:'/'});
});

test('canonical routes and error pages are left alone',()=>{
 for(const pathname of ['/contact','/404','/404.html','/bogus/unrecognized']) assert.deepEqual(observe(pathname),{});
});

test('legacy origin preserves path, query and public SPA product hashes without rewriting same-origin history',()=>{
 assert.deepEqual(observe('/contact.html','?ref=old','#content',oldHost),{location:'https://pricepine.ca/contact?ref=old#content'});
 assert.deepEqual(observe('/','?ref=old','#product/discovered-e115260ed7a10db3e049a59b',oldHost),
  {location:'https://pricepine.ca/?ref=old#product/discovered-e115260ed7a10db3e049a59b'});
 assert.deepEqual(observe('/','?ref=old','#product/test','preview.bolt.host'),{});
});

test('authentication callbacks remain on the original origin',()=>{
 for(const [search,hash] of [['?code=example',''],['','#access_token=example&type=recovery'],['?to=example','#refresh_token=example'],['?token_hash=fixture','']]){
  assert.deepEqual(observe('/',search,hash,oldHost),{});
 }
});
