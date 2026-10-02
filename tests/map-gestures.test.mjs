import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource, esStation } from './helpers/loadSource.mjs';
import { hookHarness, fakeTimers } from './helpers/hooks.mjs';

const layout = await loadSource('src/components/stationMap/markerLayout.ts');
async function mountMap(options = {}) {
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
  }, { setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout, Date: { now: timers.now }, requestAnimationFrame: callback => timers.setTimeout(callback, 0), cancelAnimationFrame: timers.clearTimeout });
  const stations = [esStation(1, -9.15, 38.72), esStation(2, -9.14, 38.72)];
  let tree;
  const render = () => { tree = hooks.render(() => StationMap({ initialRegion: { latitude: 38.72, longitude: -9.15 }, stations, onMarkerPress: () => {}, ...options })); hooks.flushEffects(); };
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


test('station camera completion waits for final center, zoom and bounds, and fires once', async () => {
  const finished=[], consumed=[], moves=[];
  const options={cameraRequest:{requestId:1,coordinates:[-9.15,38.72],mode:'station'},onCameraRequestConsumed:id=>consumed.push(id),onCameraRequestFinished:(id,region)=>finished.push([id,region])};
  const f=await mountMap(options);
  f.find('View').props.onLayout({nativeEvent:{layout:{width:360,height:720}}});f.render();
  f.find('Camera').props.ref.current={easeTo:move=>moves.push(move)};
  f.find('Map').props.onDidFinishRenderingMapFully();f.timers.advance(1);
  assert.equal(moves.length,1);assert.deepEqual(consumed,[1]);assert.equal(finished.length,0);
  const settle=(center,zoom=15.2)=>f.find('Map').props.onRegionDidChange({nativeEvent:{center,bounds:[-9.16,38.71,-9.14,38.73],zoom,bearing:0,userInteraction:false}});
  settle([-9.2,38.7]);settle([-9.15,38.72],13.3);assert.equal(finished.length,0);
  settle([-9.15,38.72]);settle([-9.15,38.72]);assert.equal(finished.length,1);
  assert.equal(finished[0][0],1);assert.equal(finished[0][1].bounds[0],-9.16);
  f.hooks.unmount();
});

test('a newer camera target supersedes the previous request and a gesture cancels automatic searching', async () => {
  const ended=[];
  const options={cameraRequest:{requestId:1,coordinates:[-9.15,38.72],mode:'station'},onCameraRequestFinished:(id,region)=>ended.push([id,region])};
  const f=await mountMap(options);
  f.find('View').props.onLayout({nativeEvent:{layout:{width:360,height:720}}});f.render();
  f.find('Camera').props.ref.current={easeTo:()=>{}};f.find('Map').props.onDidFinishRenderingMapFully();f.timers.advance(1);
  options.cameraRequest={requestId:2,coordinates:[-9.14,38.72],mode:'station'};f.render();f.timers.advance(1);
  assert.equal(ended.length,1);assert.equal(ended[0][0],1);assert.equal(ended[0][1],null);
  f.find('Map').props.onRegionIsChanging({nativeEvent:{zoom:15.2,bearing:0,userInteraction:true}});
  f.find('Map').props.onRegionDidChange({nativeEvent:{center:[-9.14,38.72],bounds:[[-9.16,38.71],[-9.14,38.73]],zoom:15.2,bearing:0,userInteraction:false}});
  assert.equal(ended.length,2);assert.equal(ended[1][0],2);assert.equal(ended[1][1],null);
  f.hooks.unmount();
});
