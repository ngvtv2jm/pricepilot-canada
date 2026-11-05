import test from 'node:test';import assert from 'node:assert/strict';import {routeFromHash} from '../src/lib/routing.ts';
test('authentication callbacks show account flow instead of a missing page',()=>{assert.equal(routeFromHash('#access_token=synthetic&refresh_token=synthetic&type=recovery'),'account');assert.equal(routeFromHash('#error_description=expired'),'account');assert.equal(routeFromHash('#type=recovery'),'account')});
test('regular routes and empty navigation remain intact',()=>{assert.equal(routeFromHash(''),'home');assert.equal(routeFromHash('#basket'),'basket');assert.equal(routeFromHash('#product/123'),'product/123')});

import {productLookupState} from '../src/lib/routing.ts';
test('product refresh waits for lookup and errors do not become not-found',()=>{
 assert.equal(productLookupState(false,true,''),'loading');
 assert.equal(productLookupState(false,false,'Network error'),'error');
 assert.equal(productLookupState(true,true,''),'ready');
 assert.equal(productLookupState(false,false,''),'missing');
});
