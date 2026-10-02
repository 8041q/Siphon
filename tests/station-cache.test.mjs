import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource, deferred, esStation } from './helpers/loadSource.mjs';

const region = await loadSource('src/utils/mapRegion.ts');
const { parseSchedule } = await loadSource('src/utils/schedule.ts', { '../i18n': { default: { t: key => key } } });
const { enrichStation } = await loadSource('src/utils/markerEnrichment.ts', { './schedule': { parseSchedule } });
class RateLimitedError extends Error {}
class RateLimiter {
  async reserveRequest() {}
  async recordBlocked() {}
}
const collection = (...features) => ({ type: 'FeatureCollection', features });

async function setup(fetcher = async () => { throw new Error('Unexpected network'); }) {
  const values = new Map(), reads = new Map(), requests = [];
  const store = {
    getItem: async key => { reads.set(key, (reads.get(key) ?? 0) + 1); return values.get(key) ?? null; },
    setItem: async (key, value) => { values.set(key, value); },
  };
  const { FuelDataClient } = await loadSource('src/api/siphonClient.ts', {
    './rateLimit': { RateLimiter, RateLimitedError }, '../utils/mapRegion': region,
  }, { fetch: async url => { requests.push(url); return fetcher(url); } });
  const seed = (path, data, hash = 'v1') => {
    values.set(`siphon:hash:${path}`, hash);
    values.set(`siphon:data:${path}`, JSON.stringify(data));
  };
  return { client: new FuelDataClient({ store }), values, reads, requests, seed };
}

test('unchanged tile searches reuse parsed stations and coalesce concurrent reads', async () => {
  const s = await setup();
  s.seed('tile', collection(esStation()));
  const [first, concurrent] = await Promise.all([s.client.fetchIfChanged({ path: 'tile', hash: 'v1' }), s.client.fetchIfChanged({ path: 'tile', hash: 'v1' })]);
  const again = await s.client.fetchIfChanged({ path: 'tile', hash: 'v1' });
  assert.equal(first, concurrent);
  assert.equal(first, again);
  assert.equal(s.reads.get('siphon:data:tile'), 1);
  assert.equal(s.requests.length, 0);
});

test('changed hashes fetch fresh prices once and invalidate cached objects', async () => {
  const network = deferred();
  const s = await setup(() => network.promise);
  s.seed('tile', collection(esStation()));
  const old = await s.client.fetchIfChanged({ path: 'tile', hash: 'v1' });
  const a = s.client.fetchIfChanged({ path: 'tile', hash: 'v2' });
  const b = s.client.fetchIfChanged({ path: 'tile', hash: 'v2' });
  network.resolve(new Response(JSON.stringify(collection(esStation(1, -8, 37.5, 1.8)))));
  const [fresh, duplicate] = await Promise.all([a, b]);
  assert.equal(s.requests.length, 1);
  assert.equal(fresh, duplicate);
  assert.notEqual(old.features[0], fresh.features[0]);
  assert.equal(fresh.features[0].properties.fuels.diesel, 1.8);
  assert.equal(s.values.get('siphon:hash:tile'), 'v2');
  assert.equal(await s.client.fetchIfChanged({ path: 'tile', hash: 'v2' }), fresh);
});

test('offline stale fallback never advances the stored hash or passes full-sync verification', async () => {
  const s = await setup(async () => { throw new Error('Offline'); });
  s.seed('tile', collection(esStation()));
  const old = await s.client.fetchIfChanged({ path: 'tile', hash: 'v1' });
  assert.equal(await s.client.fetchIfChanged({ path: 'tile', hash: 'v2' }), old);
  assert.equal(s.values.get('siphon:hash:tile'), 'v1');
  s.values.set('siphon:cache:countryManifestVersion', '2');
  s.values.set('siphon:manifest:ES', JSON.stringify({ tiles: { grid_37_8: { path: 'tile', hash: 'v2' } } }));
  s.values.set('siphon:manifest:PT', JSON.stringify({ districts: {} }));
  await assert.rejects(s.client.syncAll(), /keeping previous root manifest/);
});

test('memory cache evicts old tiles and observes external disk hash updates', async () => {
  const s = await setup();
  for (let index = 0; index < 25; index++) {
    s.seed(`tile${index}`, collection(esStation(index)));
    await s.client.fetchIfChanged({ path: `tile${index}`, hash: 'v1' });
  }
  await s.client.fetchIfChanged({ path: 'tile0', hash: 'v1' });
  assert.equal(s.reads.get('siphon:data:tile0'), 2);
  s.seed('tile0', collection(esStation(1, -8, 37.5, 2)), 'v2');
  const updated = await s.client.fetchIfChanged({ path: 'tile0', hash: 'v2' });
  assert.equal(updated.features[0].properties.fuels.diesel, 2);
  assert.equal(s.reads.get('siphon:data:tile0'), 3);
});

test('memory cache is bounded by feature count as well as tile count', async () => {
  const s = await setup();
  for (const path of ['one', 'two']) {
    s.seed(path, collection(...Array.from({ length: 4500 }, (_, id) => esStation(id))));
    await s.client.fetchIfChanged({ path, hash: 'v1' });
  }
  await s.client.fetchIfChanged({ path: 'one', hash: 'v1' });
  assert.equal(s.reads.get('siphon:data:one'), 2);
});

test('viewport requests read only intersecting tiles, include the margin, and cover wide views', async () => {
  const s = await setup();
  const tile = (path, bbox) => ({ path, bbox, hash: 'v1' });
  s.values.set('siphon:manifest:ES', JSON.stringify({ tiles: {
    grid_37_8: tile('near', [-8.05, 37.45, -7.95, 37.55]),
    grid_38_8: tile('far', [-8.05, 38.4, -7.95, 38.6]),
    grid_42_3: tile('wide', [-3.1, 42.4, -2.9, 42.6]),
  } }));
  s.values.set('siphon:manifest:PT', JSON.stringify({ districts: {} }));
  s.seed('near', collection(esStation(1), esStation(2, -7.89), esStation(3, -7.8)));
  s.seed('far', collection(esStation(4, -8, 38.5)));
  s.seed('wide', collection(esStation(5, -3, 42.5)));
  const stations = await s.client.getStationsNear(37.5, -8, [], [-8.1, 37.4, -7.9, 37.6]);
  assert.deepEqual(Array.from(stations, feature => feature.properties.id), ['es-1', 'es-2']);
  assert.equal(s.reads.get('siphon:data:far'), undefined);
  assert.equal(s.reads.get('siphon:data:wide'), undefined);
  const wide = await s.client.getStationsNear(37.5, -8, [], [-9, 37, -2, 43]);
  assert.ok(wide.some(station => station.properties.id === 'es-5'));
});

test('enrichment reuses unchanged objects and refreshes opening status and prices', () => {
  const raw = esStation();
  raw.properties.schedule = 'L-D: 09:00-17:00';
  const open = enrichStation(raw, new Date('2026-10-02T10:00:00Z'));
  assert.equal(open.properties._status, 'open');
  assert.equal(enrichStation(raw, new Date('2026-10-02T10:01:00Z')), open);
  const closed = enrichStation(raw, new Date('2026-10-02T20:00:00Z'));
  assert.notEqual(closed, open);
  assert.equal(closed.properties._status, 'closed');
  const repriced = enrichStation({ ...raw, properties: { ...raw.properties, fuels: { diesel: 2 } } });
  assert.equal(repriced.properties._priceDiesel, '2.000');
});
