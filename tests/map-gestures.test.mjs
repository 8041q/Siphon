import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource, esStation } from './helpers/loadSource.mjs';
import { hookHarness, fakeTimers } from './helpers/hooks.mjs';

const layout = await loadSource('src/components/stationMap/markerLayout.ts');
async function mountMap() {
  const hooks = hookHarness(), timers = fakeTimers();
  let stackBuilds = 0;
  const { StationMap } = await loadSource('src/components/stationMap/StationMap.tsx', {
    react: hooks.react, 'react-native': { Image: 'Image', Text: 'Text', View: 'View' },
    '@maplibre/maplibre-react-native': { Map: 'Map', Camera: 'Camera', Marker: 'Marker', GeoJSONSource: 'Source', Layer: 'Layer' },
    'expo-haptics': {}, '../../hooks/useThemeTokens': { useThemeTokens: () => ({ colors: {} }) },
    '../../hooks/useReducedMotion': { useReducedMotion: () => false },
    '../../hooks/useSupport': { useAppearanceSupport: () => ({ marker: { type: 'svg', value: 'default' } }) },
    '../userLocationMarkers': { svgMarkers: {} }, './brandIcons': { getStationMarkerImage: () => 1 },
    './markerLayout': { ...layout, getProjectedMarkerStackOrders: (...args) => { stackBuilds++; return layout.getProjectedMarkerStackOrders(...args); } },
    '../../utils/perf': { measureSync: (_name, work) => work() },
  }, { setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout, Date: { now: timers.now }, cancelAnimationFrame: () => {} });
  const stations = [esStation(1, -9.15, 38.72), esStation(2, -9.14, 38.72)];
  let tree;
  const render = () => { tree = hooks.render(() => StationMap({ initialRegion: { latitude: 38.72, longitude: -9.15 }, stations, onMarkerPress: () => {} })); hooks.flushEffects(); };
  const find = type => hooks.walk(tree).find(node => node.type === type);
  const event = (bearing, zoom = 13.3) => ({ nativeEvent: { bearing, zoom } });
  const change = (bearing, zoom) => { find('Map').props.onRegionIsChanging(event(bearing, zoom)); if (hooks.dirty) render(); };
  const settle = bearing => { find('Map').props.onRegionDidChange(event(bearing)); if (hooks.dirty) render(); };
  render();
  return { hooks, timers, render, find, change, settle, get stackBuilds() { return stackBuilds; } };
}

test('rotation updates are bounded and settling immediately applies the final stacking order', async () => {
  const f = await mountMap();
  f.change(10);
  const builds = f.stackBuilds;
  for (let bearing = 11; bearing <= 90; bearing++) f.change(bearing);
  assert.equal(f.stackBuilds, builds);
  assert.equal(f.timers.size, 1);
  f.settle(90);
  assert.equal(f.stackBuilds, builds + 1);
  assert.equal(f.timers.size, 0);
  const pins = f.hooks.walk(f.find('Map')).filter(node => typeof node.type === 'function');
  const west = pins.find(node => node.props.station.properties.id === 'es-1');
  const east = pins.find(node => node.props.station.properties.id === 'es-2');
  assert.ok(west.props.zIndex > east.props.zIndex);
  f.hooks.unmount();
});

test('trailing rotation updates use the latest bearing and pending timers stop on unmount', async () => {
  const f = await mountMap();
  f.change(10); f.change(20); f.change(40);
  const builds = f.stackBuilds;
  f.timers.advance(100); f.render();
  assert.equal(f.stackBuilds, builds + 1);
  f.change(50);
  assert.equal(f.timers.size, 1);
  f.hooks.unmount();
  assert.equal(f.timers.size, 0);
});

test('dots and native pins switch together and source payload contains only hit-test IDs', async () => {
  const f = await mountMap();
  assert.equal(f.find('Layer').props.layout.visibility, 'none');
  assert.deepEqual(Object.keys(f.find('Source').props.data.features[0].properties), ['id']);
  f.change(0, 12.89);
  assert.equal(f.find('Layer').props.layout.visibility, 'visible');
  assert.equal(f.hooks.walk(f.find('Map')).filter(node => typeof node.type === 'function').length, 0);
  const builds = f.stackBuilds;
  for (const zoom of [12.98, 13.02, 12.99]) f.change(0, zoom);
  assert.equal(f.stackBuilds, builds);
  f.change(0, 13.11);
  assert.equal(f.find('Layer').props.layout.visibility, 'none');
  assert.equal(f.hooks.walk(f.find('Map')).filter(node => typeof node.type === 'function').length, 2);
  f.hooks.unmount();
});
