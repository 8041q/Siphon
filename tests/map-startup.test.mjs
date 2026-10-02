import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource, deferred, esStation } from './helpers/loadSource.mjs';
import { hookHarness, fakeTimers } from './helpers/hooks.mjs';

const region = await loadSource('src/utils/mapRegion.ts');
const schedule = await loadSource('src/utils/schedule.ts', { '../i18n': { default: { t: key => key } } });
const enrichment = await loadSource('src/utils/markerEnrichment.ts', { './schedule': schedule });
const tick = () => new Promise(resolve => setImmediate(resolve));

async function mountProvider(catalog = []) {
  const hooks = hookHarness(), timers = fakeTimers();
  const root = deferred(), sync = deferred(), history = deferred();
  const events = [];
  let networkCatalog = catalog;
  const api = {
    rateLimiter: { shouldRunSync: async () => 'ready', recordSyncCompleted: async () => events.push('completed') },
    loadAllStationsCache: async () => catalog,
    getAllCachedStations: async () => networkCatalog,
    saveAllStationsCache: async () => {},
    checkForUpdates: async () => { events.push('root'); return root.promise; },
    stationCacheNeedsVerification: async () => false,
    getStationsNear: async (lat, lng, countries, bounds) => { events.push(['region', lat, lng, bounds]); return networkCatalog.filter(s => Math.abs(s.geometry.coordinates[0] - lng) < 0.2); },
    syncAll: async () => { events.push('sync'); return sync.promise; },
    commitRootManifest: async () => events.push('commit'),
    checkHistoryUpdates: async () => { events.push('history'); return history.promise; },
    refreshCommodityDashboard: async () => { events.push('market'); return { lastUpdated: 'today' }; },
  };
  const location = { location: { latitude: 37.5, longitude: -8, approximate: true }, hydrated: true,
    refresh: async () => {}, locateWithGps: async () => null, requesting: false };
  const storage = { getItem: async () => null, setItem: async () => {} };
  const module = await loadSource('src/hooks/useApp.tsx', {
    react: hooks.react, '@react-native-async-storage/async-storage': { default: storage },
    '../api/siphonClient': { FuelDataClient: class { constructor() { return api; } }, isFuelKey: () => true },
    '../api/rateLimit': { RateLimitedError: class extends Error {} },
    '../store/hybridStore': { hybridStore: {} }, './useLocation': { useLocation: () => location },
    '../utils/routeDistance': { roadEstimateKm: () => 1 },
    '../utils/markerEnrichment': enrichment, 'expo-haptics': {}, '../i18n': { default: { t: key => key } },
    '../utils/perf': { beginPerf: () => null, endPerf: () => {}, measureAsync: (_name, work) => work() },
    '../utils/mapRegion': region,
  }, { setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });
  const render = () => hooks.render(() => module.AppProvider({ children: null }));
  const pump = async () => {
    for (let i = 0; i < 5; i++) {
      await tick();
      if (hooks.dirty) render();
      hooks.flushEffects();
    }
  };
  render(); hooks.flushEffects(); await pump();
  return { root, sync, history, events, timers, pump, hooks, module, api, location, render,
    setCatalog: stations => { networkCatalog = stations; },
    data: () => module.useStationMapData(), state: () => module.useStationSync(), actions: () => module.useActions() };
}

test('cached nearby stations appear while the root update check is still pending', async () => {
  const fixture = await mountProvider([esStation(), esStation(2, -3, 40)]);
  assert.equal(fixture.state().loading, true);
  assert.deepEqual(Array.from(fixture.data().stations, s => s.properties.id), ['es-1']);
  assert.deepEqual(fixture.events, ['root']);
  fixture.hooks.unmount();
  fixture.root.resolve({ offline: true });
  await fixture.pump();
});

test('first launch publishes its region before full sync and finishes loading before history', async () => {
  const fixture = await mountProvider();
  fixture.setCatalog([esStation()]);
  fixture.root.resolve({ offline: false, changedCountries: ['ES'], root: {}, etag: 'v1' });
  await fixture.pump();
  fixture.timers.advance(50); await fixture.pump();
  assert.equal(fixture.data().stations.length, 1);
  assert.equal(fixture.state().loading, true);
  assert.equal(fixture.events[1][0], 'region');
  assert.ok(fixture.events.indexOf('sync') > 1);
  assert.equal(fixture.events.includes('commit'), false, 'root stays uncommitted during full sync');
  fixture.sync.resolve(); await fixture.pump();
  assert.equal(fixture.state().loading, false);
  assert.ok(fixture.events.includes('commit'));
  fixture.timers.advance(0); await fixture.pump();
  assert.ok(fixture.events.includes('history'));
  assert.equal(fixture.events.includes('market'), false);
  fixture.history.resolve({ changed: true }); await fixture.pump();
  assert.ok(fixture.events.includes('market'));
  assert.equal(fixture.module.useSecondaryDataUpdates().historyDataVersion, 1);
  assert.equal(fixture.module.useSecondaryDataUpdates().commodityDataVersion, 1);
  fixture.hooks.unmount();
});

test('obsolete region results cannot replace the newer area and identical searches keep the source stable', async () => {
  const fixture = await mountProvider([esStation()]);
  const oldArea = deferred(), newArea = deferred();
  fixture.api.getStationsNear = async (_lat, lng) => lng === -8 ? oldArea.promise : newArea.promise;
  const oldRequest = fixture.actions().loadStationsForRegion(37.5, -8);
  fixture.timers.advance(50); await fixture.pump();
  const newRequest = fixture.actions().loadStationsForRegion(40, -3);
  fixture.timers.advance(50); await fixture.pump();
  const fresh = [esStation(2, -3, 40)];
  newArea.resolve(fresh); await newRequest; await fixture.pump();
  const source = fixture.data().stations;
  oldArea.resolve([esStation()]); await oldRequest; await fixture.pump();
  assert.equal(fixture.data().stations, source);
  fixture.api.getStationsNear = async () => fresh;
  const repeated = fixture.actions().loadStationsForRegion(40, -3);
  fixture.timers.advance(50); await repeated; await fixture.pump();
  assert.equal(fixture.data().stations, source);
  fixture.hooks.unmount(); fixture.root.resolve({ offline: true }); await fixture.pump();
});

test('offline startup can rebuild nearby pins from tile cache without a trusted aggregate', async () => {
  const fixture = await mountProvider();
  fixture.setCatalog([esStation(), esStation(2, -3, 40)]);
  fixture.root.resolve({ offline: true }); await fixture.pump();
  assert.deepEqual(Array.from(fixture.data().stations, s => s.properties.id), ['es-1']);
  assert.equal(fixture.state().offline, true);
  assert.equal(fixture.state().loading, false);
  assert.equal(fixture.events.includes('sync'), false);
  fixture.hooks.unmount();
});

test('nearby pins remain usable after full sync fails and the root stays uncommitted', async () => {
  const fixture = await mountProvider();
  fixture.setCatalog([esStation()]);
  fixture.root.resolve({ offline: false, changedCountries: ['ES'], root: {}, etag: 'v1' });
  await fixture.pump(); fixture.timers.advance(50); await fixture.pump();
  fixture.sync.reject(new Error('Offline')); await fixture.pump();
  assert.equal(fixture.data().stations.length, 1);
  assert.equal(fixture.state().loading, false);
  assert.equal(fixture.events.includes('commit'), false);
  assert.equal(fixture.events.includes('history'), false);
  fixture.hooks.unmount();
});

test('the home map mounts after coordinate hydration even while syncing with no stations', async () => {
  const hooks = hookHarness();
  const sync = { loading: true, syncProgress: 'Checking updates', error: null };
  const location = { location: { latitude: 37.5, longitude: -8, approximate: true }, locationHydrated: false, locateWithGps: async () => null };
  const calls = [], remembered = [];
  const { default: MapScreen } = await loadSource('app/(tabs)/index.tsx', {
    react: hooks.react, 'expo-router': { useIsFocused: () => true },
    'react-native': { Platform: { OS: 'ios' }, Text: 'Text', TouchableOpacity: 'Button', View: 'View' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '../../src/components/stationMap/StationMap': { StationMap: 'Map' },
    '../../src/components/SyncOverlay': { SyncOverlay: 'Splash' },
    '../../src/components/MapActionButton': { MapActionButton: 'Action' },
    '../../src/components/FilterSheet': { FilterSheet: 'Filters' },
    '../../src/components/ui/icon': { Icon: 'Icon' },
    '../../src/components/ui/glass': { GlassSurface: 'Glass' },
    '../../src/hooks/useThemeTokens': { useThemeTokens: () => ({ colors: {} }) },
    '../../src/hooks/useApp': {
      useStationMapData: () => ({ stations: [], filteredStations: [] }), useStationSync: () => sync,
      useLocationState: () => location, useUI: () => ({ searchFilter: {} }),
      useActions: () => ({ loadStationsForRegion: (...args) => { calls.push(args); return Promise.resolve([]); }, rememberMapRegion: (...args) => remembered.push(args) }),
    },
  });
  assert.equal(hooks.render(MapScreen).type, 'Splash'); hooks.flushEffects();
  location.locationHydrated = true;
  const tree = hooks.render(MapScreen); hooks.flushEffects();
  const map = hooks.walk(tree).find(node => node.type === 'Map');
  assert.ok(map);
  map.props.onRegionChange(37.5, -8, [-8.1, 37.4, -7.9, 37.6]);
  map.props.onMapReady();
  assert.equal(remembered.length, 1);
  assert.equal(calls.length, 0, 'startup owns network ordering until station sync finishes');
  sync.loading = false; hooks.render(MapScreen); hooks.flushEffects();
  assert.equal(calls.length, 1, 'refreshes the current viewport after sync completes');
  hooks.unmount(); await tick();
});
