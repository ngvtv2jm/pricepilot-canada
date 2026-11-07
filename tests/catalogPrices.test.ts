import test from 'node:test';
import assert from 'node:assert/strict';
import { branchOffers, eligibleVariants, packageLabel, websiteOffers } from '../src/lib/catalogPrices.ts';
import type { Offer } from '../src/lib/domain.ts';

const now = Date.parse('2026-11-07T16:00:00Z');
const observed = '2026-11-07T10:00:00Z';
const website = { variant_id: 'discovered-1', price_cad: 5.99, member_price_cad: 4.50, retailer: 'No Frills', observed_at: observed, check_status: 'verified' };
const local: Offer = { id: 'a', variant_id: 'db-1', store_id: 'north', retailer_name: 'No Frills', status: 'active', observed_at: observed,
  regular_price: 8.99, sale_price: null, currency: 'CAD', valid_until: null, member_only: false };

test('retailer filters by website observations and branch filters by that exact branch and variant', () => {
  const variants = [{ id: 'discovered-1' }, { id: 'db-1' }, { id: 'db-2' }];
  const offers = [local, { ...local, id: 'b', store_id: 'south', regular_price: 5.99 },
    { ...local, id: 'c', store_id: 'south', variant_id: 'db-2' }];
  assert.deepEqual(eligibleVariants(variants, [website], [], 'No Frills', ''), [variants[0]]);
  const north = branchOffers(offers, 'No Frills', 'north', now, false);
  assert.deepEqual(north.map(o => o.regular_price), [8.99]);
  assert.deepEqual(eligibleVariants(variants, [website], north, 'No Frills', 'north'), [variants[1]]);
  assert.deepEqual(branchOffers(offers, 'Loblaws', 'north', now, false), []);
  assert.deepEqual(branchOffers([{ ...local, member_only: true }], '', '', now, false), []);
});

test('fresh prices rank ahead of earlier or unconfirmed observations and member prices are opt-in', () => {
  const older = { ...website, retailer: 'Loblaws', observed_at: '2026-11-03T10:00:00Z', price_cad: 3 };
  const unconfirmed = { ...website, retailer: 'Giant Tiger', check_status: 'source_unavailable', price_cad: 2 };
  const publicPrices = websiteOffers([older, unconfirmed, website], false, now);
  assert.deepEqual(publicPrices.map(p => p.state), ['current', 'unconfirmed', 'old']);
  assert.equal(publicPrices[0].amount, 5.99);
  assert.equal(publicPrices[0].memberOnly, false);
  const [member] = websiteOffers([website], true, now);
  assert.equal(member.amount, 4.50);
  assert.equal(member.memberOnly, true);
  assert.deepEqual(websiteOffers([{ ...website, price_cad: null, member_price_cad: '' }], true, now), []);
});

test('exact multipack label takes precedence over structured total weight', () => {
  assert.equal(packageLabel({ name: 'Default', quantity: 1, unit: 'kg' }, [{ package_size: '2 x 500 g' }]), '2 x 500 g');
  assert.equal(packageLabel({ name: '1 kg', quantity: 1, unit: 'kg' }), '1 kg');
  assert.equal(packageLabel({ name: '12 × 355 mL', discovered: true }), '12 × 355 mL');
  assert.equal(packageLabel({ name: 'Default' }), 'Package unavailable');
});
