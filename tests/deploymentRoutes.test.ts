import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error JavaScript build-stage helper
import {prepareDeployment} from '../scripts/prepare-deploy.mjs';

test('release routing aliases only pages that exist and keeps the canonical page available',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pricepine-routing-'));
 try {
  const dist=path.join(root,'dist');
  const files={
   'index.html':'homepage',
   '404.html':'not found',
   'contact.html':'contact',
   'cookies.html':'cookies',
   'catalog-2.html':'catalog page two',
   'products/discovered-test.html':'test product',
   'brands.html':'brand hub',
   'brands/test.html':'test brand',
   'categories.html':'category hub',
   'categories/test.html':'test category',
   'catalog-cache/image.webp':'big asset mock',
   'catalog-images/image.webp':'big asset mock',
  };
  for(const [name,body] of Object.entries(files)){
   const out=path.join(dist,name);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,body);
  }
  const result=prepareDeployment(root);
  const lines=fs.readFileSync(path.join(dist,'_redirects'),'utf8').trim().split('\n').map(l=>l.split(/\s+/));
  const dictionary=new Map(lines.map(([old,dest,status])=>[old,{dest,status}]));
  assert.deepEqual(dictionary.get('/contact.html'),{dest:'/contact',status:'301!'});
  assert.deepEqual(dictionary.get('/cookies.html'),{dest:'/cookies',status:'301!'});
  assert.deepEqual(dictionary.get('/products/discovered-test.html'),{dest:'/products/discovered-test',status:'301!'});
  assert.deepEqual(dictionary.get('/index.html'),{dest:'/',status:'301!'});
  for(const [old,{dest}] of dictionary){
   assert.equal(dictionary.has(dest),false,'no redirect loop at '+old);
   assert.equal(fs.existsSync(path.join(dist,dest==='/'?'index.html':dest.slice(1)+'.html')),true,dest);
  }
  for(const unknown of ['/:page','/not-found-fixture','/unknown.html','/products/missing.html','/404.html','/brands/index.html']){
   assert.equal(dictionary.has(unknown),false,unknown);
  }
  assert.equal(lines.every(([old,dest])=>!old.includes('*')&&!old.includes(':')&&!dest.includes(':')),true);
  assert.equal(fs.readFileSync(path.join(dist,'404.html'),'utf8'),'not found');
  assert.equal(fs.readFileSync(path.join(dist,'categories/index.html'),'utf8'),'category hub');
  assert.equal(fs.existsSync(path.join(dist,'catalog-cache')),false);
  assert.equal(fs.existsSync(path.join(dist,'catalog-images')),false);
  assert.ok(result.zipBytes<90_000_000);
 } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
