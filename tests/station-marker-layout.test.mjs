import assert from 'node:assert/strict';
import test from 'node:test';

import { MARKER_HEIGHT, PRICE_TOP, PRICE_TEXT_SIZE, getMarkerStackOrders } from '../src/components/stationMap/markerLayout.ts';

const station = (id, longitude, latitude) => ({
  properties: { id },
  geometry: { coordinates: [longitude, latitude] },
});

test('price retains the former MapLibre text offset inside the unchanged pin', () => {
  assert.equal(PRICE_TOP, MARKER_HEIGHT - 5.1 * PRICE_TEXT_SIZE);
  assert.ok(Math.abs(PRICE_TOP - 44.252) < 0.001);
});

test('lower markers get distinct integer z-indices above higher markers', () => {
  const orders = getMarkerStackOrders([
    station('north', -9.14, 38.73),
    station('south', -9.14, 38.72),
  ], 0);
  assert.ok(orders.get('south') > orders.get('north'));
  assert.ok(Number.isInteger(orders.get('south')));
  assert.ok(Number.isInteger(orders.get('north')));
});

test('marker order follows screen Y after map rotation', () => {
  const orders = getMarkerStackOrders([
    station('west', -9.15, 38.72),
    station('east', -9.14, 38.72),
  ], 90);
  assert.ok(orders.get('west') > orders.get('east'));
});
