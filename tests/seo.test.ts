import test from 'node:test';import assert from 'node:assert/strict';
// Test the exact helpers used by server-rendered product pages.
// @ts-ignore Node loads this build-time ES module directly.
import {escapeHtml,jsonLd} from '../scripts/product-pages.mjs';
test('catalog content cannot escape static HTML or JSON-LD script',()=>{assert.equal(escapeHtml('<img src=x onerror="bad">'), '&lt;img src=x onerror=&quot;bad&quot;&gt;');const data={name:'</script><script>alert(1)</script>'};const encoded=jsonLd(data);assert.equal(encoded.includes('<'),false);assert.deepEqual(JSON.parse(encoded),data);});
