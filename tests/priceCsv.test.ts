import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {readPrices} from '../src/lib/priceCsv.ts';
const header='name,brand,package_size,retailer,retailer_sku,price_cad,product_url,observed_at_utc,store_scope,member_price_cad,currency\n';
const row='Cereal,Brand,350 g,No Frills,123_EA,4,https://www.nofrills.ca/en/cereal/p/123_EA,2026-11-05T14:00:00Z,Website default,3.50,CAD';
const now=Date.parse('2026-11-05T15:00:00Z');
test('prices retain retailer, member condition and unconfirmed location',()=>{const r=readPrices(header+row,now)[0];assert.equal(r.price_cad,'4');assert.equal(r.member_price_cad,'3.50');assert.equal(r.store_scope,'Website default')});
test('prices reject currency, spoofed URLs, wrong SKU and future dates',()=>{for(const bad of [row.replace('CAD','USD'),row.replace('www.nofrills.ca','www.loblaws.ca'),row.replace('/123_EA','/999_EA'),row.replace('14:00:00','16:00:00'),row.replace(',3.50,',',NaN,')])assert.throws(()=>readPrices(header+bad,now))});
test('all cached covers decode as WebP and cover 100 distinct source URLs',()=>{const map=JSON.parse(fs.readFileSync(new URL('../src/lib/catalogImages.json',import.meta.url),'utf8'));assert.equal(Object.keys(map).length,100);for(const path of Object.values(map)){const bytes=fs.readFileSync(new URL('../public'+path,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP')}});
