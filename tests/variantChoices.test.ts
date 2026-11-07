import assert from 'node:assert/strict';
import test from 'node:test';
import { variantChoices, sourceLicenseText, VARIANT_CHOICE_LIMIT } from '../src/lib/variantChoices.ts';

const choices = Array.from({ length: 75 }, (_, index) => ({ id: String(index), label: `Milk ${index} 2 L`, searchText: `Québon Milk ${index} 2 L` }));
test('variant selector starts short and caps matching choices', () => {
  assert.equal(variantChoices(choices, '').options.length, 0);
  assert.equal(variantChoices(choices, 'm').searching, false);
  assert.equal(variantChoices(choices, 'milk').options.length, VARIANT_CHOICE_LIMIT);
  assert.equal(variantChoices(choices, 'milk').total, 75);
});
test('variant search accepts brand, package, reordered terms and accents', () => {
  assert.equal(variantChoices(choices, '2 L quebon').total, 75);
  assert.equal(variantChoices(choices, 'not-in-this-catalog').total, 0);
});
test('current choice stays selectable beyond the cap or a changed query', () => {
  assert.equal(variantChoices(choices, 'milk', '74').options.length, VARIANT_CHOICE_LIMIT + 1);
  assert.equal(variantChoices(choices, 'milk', '74').options[0].id, '74');
  assert.deepEqual(variantChoices(choices, 'cereal', '74').options.map(option => option.id), ['74']);
  assert.deepEqual(variantChoices(choices, '', '74').options.map(option => option.id), ['74']);
  assert.equal(variantChoices(choices, 'milk', '0').options.length, VARIANT_CHOICE_LIMIT);
  assert.equal(variantChoices([], 'milk', '74').options.length, 0);
});
test('missing and punctuated source-license text does not leave stray separators', () => {
  for (const value of [undefined, null, '', ' ', '.', ' · . ']) assert.equal(sourceLicenseText(value), '');
  assert.equal(sourceLicenseText('Public retailer listing.'), 'Public retailer listing');
  assert.equal(sourceLicenseText('  CC BY-SA 4.0  '), 'CC BY-SA 4.0');
});
