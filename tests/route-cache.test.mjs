import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';

async function loadSource(relative, dependencies) {
  const source = await readFile(new URL(relative, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: false },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

const point = { id: 'station', latitude: 38.73, longitude: -9.15 };
const legacyKey = 'siphon:route:v2:user:station:38.73000:-9.15000';
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function fixture() {
  const files = new Map();
  const preferences = new Map();
  const storage = {
    getItem: async (key) => preferences.get(key) ?? null,
    removeItem: async (key) => { preferences.delete(key); },
    getAllKeys: async () => [...preferences.keys()],
    multiRemove: async (keys) => { for (const key of keys) preferences.delete(key); },
  };
  const store = {
    getItem: async (key) => files.get(key) ?? null,
    setItem: async (key, value) => { files.set(key, value); },
    removeItem: async (key) => { files.delete(key); },
    clearRouteCache: async () => {
      const routes = [...files.keys()].filter((key) => key.startsWith('siphon:route:'));
      for (const key of routes) files.delete(key);
      return routes.length;
    },
  };
  const provider = {
    id: 'osrm', cacheNamespace: 'osrm',
    routeDistanceKm: async () => 12,
    tableDistancesKm: async (_origin, points) => new Map(points.map((p) => [p.id, 12])),
  };
  const api = await loadSource('../src/utils/routeDistance.ts', {
    '@react-native-async-storage/async-storage': { default: storage },
    '../store/hybridStore': { hybridStore: store },
    '../routing': { routingProvider: provider },
  });
  return { api, store, storage, provider, files, preferences };
}

test('clearing removes current and legacy distances but retains unrelated user data', async () => {
  const { api, files, preferences } = await fixture();
  await api.roadDistanceKm(38.72, -9.14, point.latitude, point.longitude, 'user', point.id);
  preferences.set(legacyKey, '{"value":10}');
  preferences.set('siphon:settings:autoCheckUpdates', 'false');
  preferences.set('siphon:favorites', '["station"]');
  files.set('siphon:history:station.json', 'history');
  assert.equal(await api.clearRouteDistanceCache(), 2);
  assert.deepEqual([...files], [['siphon:history:station.json', 'history']]);
  assert.deepEqual([...preferences], [
    ['siphon:settings:autoCheckUpdates', 'false'], ['siphon:favorites', '["station"]'],
  ]);
  assert.equal(await api.clearRouteDistanceCache(), 0);
});

for (const [component, method] of [['store', 'clearRouteCache'], ['storage', 'getAllKeys'], ['storage', 'multiRemove']]) {
  test(`clearing reports ${method} failures instead of claiming success`, async () => {
    const fixtureData = await fixture();
    fixtureData.preferences.set(legacyKey, '{"value":10}');
    fixtureData[component][method] = async () => { throw new Error('storage unavailable'); };
    await assert.rejects(fixtureData.api.clearRouteDistanceCache(), /storage unavailable/);
    // A rejected clear releases the barrier so it does not block future routing.
    assert.equal((await fixtureData.api.roadDistanceKm(38.72, -9.14, 38.73, -9.15, 'user', 'station')).source, 'route');
  });
}

for (const mode of ['single', 'batch']) {
  test(`clearing waits for an in-flight ${mode} request and removes its delayed writes`, async () => {
    const { api, provider, files } = await fixture();
    const network = deferred();
    let started = false;
    if (mode === 'single') {
      provider.routeDistanceKm = () => { started = true; return network.promise; };
    } else {
      provider.tableDistancesKm = () => { started = true; return network.promise; };
    }
    const route = mode === 'single'
      ? api.roadDistanceKm(38.72, -9.14, 38.73, -9.15, 'user', 'station')
      : api.roadDistancesKm(38.72, -9.14, [point], 'user');
    await tick();
    assert.equal(started, true);
    const clear = api.clearRouteDistanceCache();
    assert.equal(api.clearRouteDistanceCache(), clear, 'overlapping clears share one operation');
    let cleared = false;
    void clear.then(() => { cleared = true; });
    await tick();
    assert.equal(cleared, false);
    network.resolve(mode === 'single' ? 12 : new Map([['station', 12]]));
    await route;
    assert.equal(await clear, 1);
    assert.equal(files.size, 0);
    let freshRequests = 0;
    provider.routeDistanceKm = async () => { freshRequests += 1; return 15; };
    assert.equal((await api.roadDistanceKm(38.72, -9.14, 38.73, -9.15, 'user', 'station')).value, 15);
    assert.equal(freshRequests, 1, 'cleared distances must be fetched again');
  });
}

test('new routing calls wait until deletion finishes', async () => {
  const { api, store, provider } = await fixture();
  const deletion = deferred();
  store.clearRouteCache = () => deletion.promise;
  let requests = 0;
  provider.routeDistanceKm = async () => { requests += 1; return 12; };
  const clear = api.clearRouteDistanceCache();
  const route = api.roadDistanceKm(38.72, -9.14, 38.73, -9.15, 'user', 'station');
  await tick();
  assert.equal(requests, 0);
  deletion.resolve(0);
  await clear;
  await route;
  assert.equal(requests, 1);
});

test('clearing also waits for legacy migration before removing its new file', async () => {
  const { api, store, preferences, files } = await fixture();
  preferences.set(legacyKey, '{"value":10}');
  const write = deferred();
  let started = false;
  store.setItem = async (key, value) => {
    started = true;
    await write.promise;
    files.set(key, value);
  };
  const route = api.roadDistanceKm(38.72, -9.14, 38.73, -9.15, 'user', 'station');
  await tick();
  assert.equal(started, true);
  const clear = api.clearRouteDistanceCache();
  write.resolve();
  assert.equal((await route).value, 10);
  assert.equal(await clear, 1);
  assert.equal(files.size, 0);
  assert.equal(preferences.size, 0);
});

async function fileStoreFixture() {
  const entries = new Map([['/documents', 'directory']]);
  let failedDelete = null;
  const join = (...segments) => path.posix.join(...segments.map((segment) => typeof segment === 'string' ? segment : segment.uri));
  class Directory {
    constructor(...segments) { this.uri = join(...segments); this.name = path.posix.basename(this.uri); }
    create() {
      let current = this.uri;
      while (current !== '/') { entries.set(current, 'directory'); current = path.posix.dirname(current); }
    }
    list() {
      return [...entries].filter(([uri]) => path.posix.dirname(uri) === this.uri)
        .map(([uri, kind]) => kind === 'directory' ? new Directory(uri) : new File(uri));
    }
  }
  class File {
    constructor(...segments) { this.uri = join(...segments); this.name = path.posix.basename(this.uri); }
    get exists() { return entries.get(this.uri) === 'file'; }
    delete() {
      if (this.uri === failedDelete) throw new Error('permission denied');
      entries.delete(this.uri);
    }
  }
  const { hybridStore } = await loadSource('../src/store/hybridStore.ts', {
    '@react-native-async-storage/async-storage': { default: {} },
    'expo-file-system': { File, Directory, Paths: { document: '/documents' } },
  });
  return { hybridStore, entries, failDelete: (uri) => { failedDelete = uri; } };
}

test('file-backed deletion reaches nested route files and preserves history', async () => {
  const { hybridStore, entries } = await fileStoreFixture();
  entries.set('/documents/siphon/routes/v3', 'directory');
  entries.set('/documents/siphon/routes/v3/osrm', 'directory');
  entries.set('/documents/siphon/routes/v3/osrm/a.json', 'file');
  entries.set('/documents/siphon/routes/old.json', 'file');
  entries.set('/documents/siphon/history/station.json', 'file');
  assert.equal(await hybridStore.clearRouteCache(), 2);
  assert.equal(entries.has('/documents/siphon/history/station.json'), true);
  assert.equal(entries.has('/documents/siphon/routes/v3/osrm/a.json'), false);
});

test('file-backed deletion surfaces filesystem errors', async () => {
  const { hybridStore, entries, failDelete } = await fileStoreFixture();
  const route = '/documents/siphon/routes/a.json';
  entries.set(route, 'file');
  failDelete(route);
  await assert.rejects(hybridStore.clearRouteCache(), /permission denied/);
  assert.equal(entries.has(route), true);
});
