import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { directoryStale, distanceKm, nearbyBranches, pilotArea, postalArea } from '../src/lib/nearbyBranches.ts';
import type { Directory } from '../src/lib/nearbyBranches.ts';

const directory: Directory = JSON.parse(readFileSync(new URL('../public/toronto-branches.json', import.meta.url), 'utf8'));

test('location lookup uses only a valid Canadian postal prefix', () => {
  assert.equal(postalArea(' m5v 2t6 '), 'M5V');
  assert.equal(postalArea('M5V2T6'), 'M5V');
  assert.equal(postalArea('M5V'), 'M5V');
  assert.equal(postalArea('12345'), null);
  assert.equal(postalArea('D5V 2T6'), null);
  assert.equal(postalArea('M5V 2T'), null);
  assert.equal(directory.centres.V6B, undefined);
  assert.equal(pilotArea([49.28, -123.12]), false);
});

test('Toronto locations are sorted by straight-line distance and filtered by radius and retailer', () => {
  const origin = directory.centres.M5V;
  assert.ok(pilotArea(origin));
  assert.equal(distanceKm(origin, origin), 0);
  const all = nearbyBranches(directory.branches, origin, 5, '');
  const selected = nearbyBranches(directory.branches, origin, 2, 'No Frills');
  assert.ok(all.length > selected.length && selected.length > 0);
  assert.ok(selected.every(x => x.retailer === 'No Frills' && x.distance <= 2));
  assert.ok(all.every((x, i) => i === 0 || x.distance >= all[i - 1].distance));
  assert.equal(nearbyBranches(directory.branches, origin, 1, 'Giant Tiger').length, 0);
  assert.equal(new Set(directory.branches.map(x => x.id)).size, directory.branches.length);
});

test('a stale or invalid directory date is identified', () => {
  assert.equal(directoryStale('2026-10-01', Date.parse('2026-10-25')), false);
  assert.equal(directoryStale('2026-10-01', Date.parse('2026-11-25')), true);
  assert.equal(directoryStale('invalid'), true);
});

test('Dundas conversion keeps the current No Frills and excludes the retired Loblaws identity', () => {
  assert.equal(directory.branches.some(branch => branch.id === 'dinesafe-001Vo000013QiZdIAK'), false);
  const current = directory.branches.find(branch => branch.id === 'dinesafe-001Vo0000275HxdIAE');
  assert.equal(current?.retailer, 'No Frills');
  assert.equal(current?.address, '2280 Dundas St W');
});

test('device location is first-party only and remains subject to browser consent', () => {
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.match(headers, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(self\), payment=\(\)/);
});
