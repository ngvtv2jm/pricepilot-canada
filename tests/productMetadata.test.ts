import assert from 'node:assert/strict';
import test from 'node:test';
import {productMetadata} from '../scripts/product-metadata.mjs';
test('metadata keeps verified brand, package and exact product identity',()=>{
 assert.equal(productMetadata({name:'Apple Juice'},'Allen’s',[{name:'2 L'}],true).title,'Allen’s Apple Juice (2 L)');
 assert.equal(productMetadata({name:'Betty Crocker Cake Mix, 375g'},'Betty Crocker',[{name:'375 g'}],true).title,'Betty Crocker Cake Mix, 375g');
 assert.equal(productMetadata({name:'Apple Juice'},'', [{name:'2 L'},{name:'375 mL'}],true).title,'Apple Juice');
 assert.equal(productMetadata({name:'Apple Juice'},'', [{name:'Unknown size'}],false).title,'Apple Juice');
});
test('metadata distinguishes dated comparisons from no recorded price',()=>{
 assert.match(productMetadata({name:'Apple Juice'},'',[],true).description,/dated Canadian retailer prices/);
 assert.match(productMetadata({name:'Apple Juice'},'',[],false).description,/No retailer price observations/);
});
