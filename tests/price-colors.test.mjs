import assert from 'node:assert/strict';
import test from 'node:test';
import { priceLevel, priceLevelColor } from '../src/utils/priceColors.ts';
const now = Date.UTC(2026, 9, 2);
const band = (fuel, country, low, high, unit = 'EUR/L') => ({ fuel, country, unit, greenBelow: low, redAbove: high, reference: (low + high) / 2, referenceMonths: 120, inflationMonth: '2026-09' });
const benchmark = { schemaVersion: 1, method: 'anchored_real_net_price_quartiles', referenceStart: '2010-01', referenceEnd: '2019-12', asOf: '2026-09-28', source: 'fixture', bands: {
  diesel_pt: band('diesel', 'PT', 1.45, 1.75), gasoline95_pt: band('gasoline95', 'PT', 1.57, 1.82), diesel_es: band('diesel', 'ES', 1.1, 1.4), lpg_es: band('lpg', 'ES', .8, 1),
} };

test('fuel and country have distinct anchored bands and boundary prices remain amber', () => {
  assert.equal(priceLevel(1.5, 'diesel', 'PT', benchmark, now), 'mid');
  assert.equal(priceLevel(1.5, 'gasoline95', 'PT', benchmark, now), 'low');
  assert.equal(priceLevel(1.5, 'diesel', 'ES', benchmark, now), 'high');
  assert.equal(priceLevel(1.45, 'diesel', 'PT', benchmark, now), 'mid');
  assert.equal(priceLevel(1.75, 'diesel', 'PT', benchmark, now), 'mid');
});

test('a widespread increase can make every station red and the cheapest is still red', () => {
  for (const price of [1.9, 2.05, 2.3]) assert.equal(priceLevel(price, 'diesel', 'PT', benchmark, now), 'high');
  assert.equal(priceLevel(1.4, 'diesel', 'PT', benchmark, now), 'low', 'a genuinely low price remains green regardless of other stations');
});

test('unknown fuels, mismatched units, stale or malformed references stay neutral', () => {
  for (const fuel of ['dieselPremium', 'cngkg', 'lpg']) assert.equal(priceLevel(.7, fuel, 'PT', benchmark, now), 'unknown');
  assert.equal(priceLevel(.7, 'lpg', 'ES', benchmark, now), 'low');
  assert.equal(priceLevel(NaN, 'diesel', 'PT', benchmark, now), 'unknown');
  assert.equal(priceLevel(-1, 'diesel', 'PT', benchmark, now), 'unknown');
  assert.equal(priceLevel(1.2, 'diesel', 'PT', null, now), 'unknown');
  assert.equal(priceLevel(1.2, 'diesel', 'PT', {...benchmark, asOf:'2025-01-01'}, now), 'unknown');
  assert.equal(priceLevel(1.2, 'diesel', 'PT', {...benchmark, asOf:'2027-01-01'}, now), 'unknown');
  assert.equal(priceLevel(1.2, 'diesel', 'PT', {...benchmark, bands:{diesel_pt:band('diesel','PT',2,1)}}, now), 'unknown');
  assert.equal(priceLevelColor('unknown', {label:'neutral',priceLow:'green',priceMid:'amber',priceHigh:'red'}), 'neutral');
  const colors = { label:'black', secondaryLabel:'gray', priceLow:'green', priceMid:'orange', priceHigh:'red' };
  assert.equal(priceLevelColor('unknown', colors, 'light'), 'gray');
  assert.equal(priceLevelColor('unknown', colors, 'dark'), 'black');
});
