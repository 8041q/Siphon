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

test('projected stacking preserves the original ordering across rotations', async () => {
  const { projectStations, getProjectedMarkerStackOrders } = await import('../src/components/stationMap/markerLayout.ts');
  const stations = Array.from({ length: 80 }, (_, index) => station(String(index), -9 + (index % 9) * 0.003, 38 + Math.floor(index / 9) * 0.002));
  const projected = projectStations(stations);
  for (const bearing of [-180, -90, 0, 17, 90, 179, 270, 359]) {
    const radians = Math.PI / 180;
    const depth = station => {
      const [longitude, latitude] = station.geometry.coordinates;
      const x = (longitude + 180) / 360;
      const y = (1 - Math.log(Math.tan(Math.PI / 4 + latitude * radians / 2)) / Math.PI) / 2;
      return y * Math.cos(bearing * radians) - x * Math.sin(bearing * radians);
    };
    const expected = new Map([...stations].sort((a, b) => depth(b) - depth(a)).map((station, index) => [station.properties.id, stations.length - index]));
    assert.deepEqual(getProjectedMarkerStackOrders(projected, bearing), expected);
  }
});

test('small zoom oscillations keep the current marker mode', async () => {
  const { detailedMarkersVisible } = await import('../src/components/stationMap/markerLayout.ts');
  let detailed = true;
  for (const zoom of [13.02, 12.98, 13.01, 12.95, NaN]) {
    detailed = detailedMarkersVisible(zoom, detailed);
    assert.equal(detailed, true);
  }
  detailed = detailedMarkersVisible(12.89, detailed);
  assert.equal(detailed, false);
  for (const zoom of [13.02, 12.98, 13.09]) {
    detailed = detailedMarkersVisible(zoom, detailed);
    assert.equal(detailed, false);
  }
  assert.equal(detailedMarkersVisible(13.11, detailed), true);
});
