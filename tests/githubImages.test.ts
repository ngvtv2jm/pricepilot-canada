import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {githubProductImage,productImageBase} from '../src/lib/githubImages.ts';
// @ts-ignore Build-time module runs in Node.
import {prepareDeployment} from '../scripts/prepare-deploy.mjs';

test('old imported image paths and new content-addressed images use GitHub',()=>{
 const cached='catalog-cache/'+'a'.repeat(64)+'.webp';
 for(const value of ['/catalog-images/123_EA.webp','https://pricepine.ca/catalog-images/123_EA.webp','https://pricepilot-canada-0s3l.bolt.host/catalog-images/123_EA.webp'])assert.equal(githubProductImage(value),productImageBase+'catalog-images/123_EA.webp');
 assert.equal(githubProductImage('/'+cached),productImageBase+cached);
 assert.equal(githubProductImage(productImageBase+cached),productImageBase+cached);
 for(const value of ['https://example.com/catalog-images/123.webp','/catalog-cache/../../secret','/pricepine-social-card.png'])assert.equal(githubProductImage(value),value);
});
test('deployment excludes product images while source images and indexed pages survive',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pricepine-deploy-'));
 try{
  for(const parent of ['public','dist'])for(const dir of ['catalog-cache','catalog-images']){fs.mkdirSync(path.join(root,parent,dir),{recursive:true});fs.writeFileSync(path.join(root,parent,dir,'image.webp'),'original-image');}
  fs.mkdirSync(path.join(root,'dist/products'));fs.writeFileSync(path.join(root,'dist/index.html'),'<h1>PricePine</h1>');fs.writeFileSync(path.join(root,'dist/products/one.html'),'<h1>Product</h1>');fs.writeFileSync(path.join(root,'dist/sitemap.xml'),'<urlset/>');
  const report=prepareDeployment(root);
  assert.equal(report.files,3);assert.ok(report.zipBytes<100_000_000);
  for(const dir of ['catalog-cache','catalog-images']){assert.equal(fs.existsSync(path.join(root,'dist',dir)),false);assert.equal(fs.readFileSync(path.join(root,'public',dir,'image.webp'),'utf8'),'original-image');}
  assert.ok(fs.existsSync(path.join(root,'dist/products/one.html')));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
