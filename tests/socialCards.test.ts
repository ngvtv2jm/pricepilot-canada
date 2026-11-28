import {productSharePath} from '../src/lib/productShare.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {socialImageFor} from '../scripts/social-cards.mjs';

const origin='https://pricepine.ca';
const fallback='/pricepine-social-card.png';
const read=(file:string)=>fs.readFileSync(file,'utf8');

test('social assets are same-origin and pagination uses its own aisle artwork',()=>{
 assert.equal(socialImageFor(origin,'categories/yogurt-2.html',fallback).url,origin+'/social/v1/yogurt.png');
 assert.equal(socialImageFor(origin,'categories/nut-spreads.html',fallback).url,origin+'/social/v1/nut-spreads.png');
 assert.equal(socialImageFor(origin,'categories/new-aisle.html',fallback).url,origin+fallback);
 assert.equal(socialImageFor(origin,'products/example.html',fallback).url,origin+fallback);
});

test('initial HTML supplies one large card per network and preserves the canonical on public pages',()=>{
 const routes=[...read('public/sitemap.xml').matchAll(/<loc>https:\/\/pricepine\.ca\/([^<]*)<\/loc>/g)].map(m=>m[1]);
 assert.ok(routes.length>5000);
 for(const path of routes){
  const file=path?path+'.html':'index.html';
  const html=read(path?'public/'+file:file).split('</head>')[0];
  const bodyPhoto=path.startsWith('products/')?read('public/'+file).match(/<h1>[^<]*<\/h1><img src="([^"]+)/)?.[1]:undefined;
  const {url,type,width,height,card}=socialImageFor(origin,file,fallback,{image:bodyPhoto});
  const one=(sel:string,expected:string)=>{
   const matches=[...html.matchAll(new RegExp('<meta '+sel+' content="([^"]+)"','g'))];
   assert.deepEqual(matches.map(m=>m[1]),[expected],file+' '+sel);
  };
  one('property="og:image"',url);
  one('property="og:image:secure_url"',url);
  one('property="og:image:type"',type);
  if(width&&height){one('property="og:image:width"',String(width));one('property="og:image:height"',String(height));}
  else assert.doesNotMatch(html,/og:image:(width|height)/,file);
  one('name="twitter:card"',card||'summary_large_image');
  one('name="twitter:image"',url);
  one('property="og:url"',origin+'/'+path);
  assert.ok(html.includes('rel="canonical" href="'+origin+'/'+path+'"'),file);
  if(new URL(url).origin===origin)assert.ok(fs.statSync('public'+new URL(url).pathname).size<500000,file);
 }
});

test('the reported product has its own photo and a copyable canonical route',()=>{
 const id='discovered-188d5b4599c9f843487ccbf2';
 const manifest=new Set<string>(JSON.parse(read('public/product-page-ids.json')));
 assert.equal(productSharePath(id,manifest),'/products/'+id);
 assert.equal(productSharePath('not-listed',manifest),null);
 assert.equal(productSharePath('../other',new Set(['../other'])),null);
 const head=read('public/products/'+id+'.html').split('</head>')[0];
 assert.match(head,/og:title[^>]+Betty Crocker Angel Food Cake Mix/);
 assert.ok(head.includes('og:image" content="'+origin+'/social/products/v1/'+id+'.jpg"'));
 assert.match(head,/og:image:type" content="image\/jpeg"/);
 assert.doesNotMatch(head,/og:image" content="https:\/\/pricepine\.ca\/pricepine-social-card/);
});
