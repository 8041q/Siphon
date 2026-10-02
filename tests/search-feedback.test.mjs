import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearchText, stationSearchText, matchesSearch } from '../src/utils/stationSearch.ts';
import { stationAgeDays } from '../src/utils/stationFreshness.ts';
import { esStation, loadSource, deferred } from './helpers/loadSource.mjs';
import { hookHarness, fakeTimers } from './helpers/hooks.mjs';

const station = esStation(); station.properties.brand = 'Galp'; station.properties.municipality = 'São João'; station.properties.address = 'Avenida da Liberdade';
test('one query matches brand, municipality, province, address and accent-free tokens together', () => {
  const index = stationSearchText(station);
  assert.ok(matchesSearch(index.text, normalizeSearchText('  GALP sao JOAO  ')));
  assert.ok(matchesSearch(index.text, normalizeSearchText('liberdade galp')));
  assert.ok(matchesSearch(index.location, normalizeSearchText('SÃO JOÃO')));
  assert.ok(!matchesSearch(index.text, normalizeSearchText('Galp Porto')));
});

test('freshness follows Lisbon calendar days across DST and rejects missing/invalid/future dates', () => {
  const now = new Date('2026-10-02T23:30:00Z'); // Oct 3 in Lisbon
  assert.equal(stationAgeDays('2026-10-03 00:20', now), 0);
  assert.equal(stationAgeDays('2026-10-02 10:00', now), 1);
  assert.equal(stationAgeDays('2026-09-30 09:00', now), 3);
  for (const value of [undefined,'','2026-02-31','2026-10-04','2026-10-02 24:99']) assert.equal(stationAgeDays(value,now),null);
});

test('feedback honors the Android accessibility timeout and old async timers cannot hide newer feedback', async () => {
  const hooks=hookHarness(),timers=fakeTimers(),first=deferred(); let reads=0;
  const {useTransientFeedback}=await loadSource('src/hooks/useTransientFeedback.ts', {
    react:hooks.react,'react-native':{Platform:{OS:'android'},AccessibilityInfo:{getRecommendedTimeoutMillis:()=>++reads===1?first.promise:Promise.resolve(10000)}},
  },{setTimeout:timers.setTimeout,clearTimeout:timers.clearTimeout});
  const render=()=>hooks.render(()=>useTransientFeedback()); let state=render();hooks.flushEffects();
  state.show('old');state.show('new');await new Promise(resolve=>setImmediate(resolve));
  first.resolve(4000);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(timers.size,1);timers.advance(5000);assert.equal(render().feedback,'new');
  timers.advance(5000);assert.equal(render().feedback,null);
  render().show('last');hooks.unmount();await new Promise(resolve=>setImmediate(resolve));assert.equal(timers.size,0);
});

test('search keeps indexed filtering isolated from unrelated road-distance updates', async () => {
  const hooks=hookHarness();hooks.react.useDeferredValue=value=>value;
  const ui={searchFilter:{},favorites:new Set(),setSearchFilter:filter=>{ui.searchFilter=filter;},setSelectedStation:()=>{},requestMapFocus:()=>{},toggleFavorite:()=>{}};
  const location={latitude:37.5,longitude:-8};
  let distances=new Map(),builds=0,filters=0;
  const {default:Search}=await loadSource('app/(tabs)/search.tsx',{
    react:hooks.react,'react-native':{Text:'Text',TextInput:'Input',TouchableOpacity:'Button',View:'View'},
    '@shopify/flash-list':{FlashList:'List'},'react-native-safe-area-context':{SafeAreaView:'Safe',useSafeAreaInsets:()=>({bottom:0})},
    'react-i18next':{useTranslation:()=>({t:key=>key})},'expo-router':{useRouter:()=>({navigate:()=>{}})},
    '../../src/components/ui/icon':{Icon:'Icon'},'../../src/components/StationCard':{StationCard:'Card'},
    '../../src/components/FilterSheet':{FilterSheet:'Filters'},
    '../../src/components/ui/ScreenState':{ScreenState:'State'},'../../src/hooks/useThemeTokens':{useThemeTokens:()=>({colors:{}})},
    '../../src/hooks/useApp':{useStationCatalog:()=>({allStations:catalog}),useStationDistances:()=>({stationDistances:distances,routedStationIds:new Set(),distanceLoading:false}),useStationSync:()=>({loading:false,error:null}),useLocationState:()=>({location}),useUI:()=>ui},
    '../../src/theme/layout':{tabBarClearance:()=>68},'../../src/utils/routeDistance':{roadEstimateKm:()=>1},
    '../../src/utils/perf':{measureSync:(name,work)=>{name.endsWith('build_index')?builds++:filters++;return work();}},
    '../../src/utils/stationSearch':{normalizeSearchText,stationSearchText,matchesSearch},'../../src/utils/fuelNames':{fuelLabel:key=>key},
  });
  const catalog=[station,esStation(2)];
  const render=()=>hooks.render(Search);let tree=render();hooks.flushEffects();
  const results=()=>hooks.walk(tree).find(node=>typeof node.type==='function'&&node.props.results).props;
  assert.equal(results().results.length,2);
  const bar=hooks.walk(tree).find(node=>typeof node.type==='function'&&node.props.setBrandQuery); // first function is SearchBar
  bar.props.setBrandQuery('galp sao joao');tree=render();
  assert.equal(results().results.length,1);
  const previous=filters;distances=new Map([['es-1',3]]);tree=render();
  assert.equal(builds,1);assert.equal(filters,previous);
  ui.searchFilter={countries:['PT']};tree=render();assert.equal(results().results.length,0);
  results().onClear();tree=render();assert.equal(results().results.length,2);assert.equal(Object.keys(ui.searchFilter).length,0);
});
