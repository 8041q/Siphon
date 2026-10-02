import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function loadSource(relative, dependencies = {}) {
  const source = await readFile(new URL(relative, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return module.exports;
}

const vehiclesMath = await loadSource('../src/utils/vehicles.ts');
const en = JSON.parse(await readFile(new URL('../src/i18n/locales/en.json', import.meta.url), 'utf8'));
const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
function station(id, price, source = 'PT', fuel = 'gasoline95') {
  return { properties: { id, source, brand: id, fuels: { [fuel]: price } } };
}

async function renderComparison({ capacity = 55, consumption = 6, price = 1.65, distance = 10,
  fuel = 'gasoline95', source = 'PT', candidates = [[station('Nearby', 1.8), 2]] } = {}) {
  const vehicle = { id: 'car', name: 'My car', fuels: [{ fuelType: fuel, consumption, capacity }] };
  const { WorthTheDrive } = await loadSource('../src/components/WorthTheDrive.tsx', {
    react: { useMemo: factory => factory(), useCallback: callback => callback },
    'react-native': { Text: 'Text', View: 'View' },
    'expo-router': { useRouter: () => ({ navigate: () => {} }) },
    'react-i18next': { useTranslation: () => ({ t: (key, values = {}) => {
      const template = key.split('.').reduce((value, part) => value?.[part], en);
      assert.equal(typeof template, 'string', `Missing translation ${key}`);
      return template.replace(/{{(.*?)}}/g, (_, name) => String(values[name]));
    } }) },
    '../api/siphonClient': { isFuelKey: key => ['gasoline95', 'lpg'].includes(key) },
    '../hooks/useApp': {
      useUI: () => ({ requestMapFocus: () => {} }),
      useStationCatalog: () => ({ allStations: candidates.map(([candidate]) => candidate) }),
      useStationDistances: () => ({ stationDistances: new Map(candidates.map(([candidate, km]) => [candidate.properties.id, km])), routedStationIds: new Set(candidates.map(([candidate]) => candidate.properties.id)) }),
    },
    '../hooks/useVehicles': { useVehicles: () => ({ vehicles: [vehicle] }) },
    '../hooks/useThemeTokens': { useThemeTokens: () => ({ colors: {} }) },
    '../utils/fuelNames': { fuelLabel: key => key, fuelUnit: () => '€/L' },
    '../utils/vehicles': vehiclesMath,
    './ui/GlassBox': { GlassBox: 'GlassBox' },
  });
  const tree = WorthTheDrive({ station: station('Target', price, source, fuel), distanceKm: distance, distanceRouted: true });
  return { text: text(tree), tree, vehicle, reference: walk(tree).find(node => node.props?.accessibilityRole === 'link')?.props.children };
}

test('tank-specific reserves reduce refills and invalid/small capacities remain safe', () => {
  for (const [capacity, reserve, refill] of [[40, 4, 36], [45, 4, 41], [55, 6, 49], [60, 6, 54], [80, 10, 70], [300, 10, 290], [10, 1, 9]]) {
    assert.equal(vehiclesMath.tankReserveLiters(capacity), reserve);
    assert.equal(vehiclesMath.refillLiters(capacity), refill);
  }
  for (const capacity of [NaN, Infinity, -5, 0]) assert.equal(vehiclesMath.refillLiters(capacity), 0);
});

test('savings and liquid CO2 use refill volume while EV range estimates stay unchanged', () => {
  assert.equal(vehiclesMath.savingPerTank(0.1, 55), 4.9);
  assert.equal(vehiclesMath.co2PerTank(55, 'diesel'), 49 * vehiclesMath.co2PerLiter('diesel'));
  assert.equal(vehiclesMath.co2PerTank(450, 'electric', 17), 450 / 100 * 17 * vehiclesMath.GRID_CO2_KG_PER_KWH);
  assert.equal(vehiclesMath.co2PerTank(450, 'electric'), 0);
});

test('fuel card shows reserve-aware refill cost and net savings without changing configured capacity', async () => {
  const result = await renderComparison();
  assert.ok(result.text.includes('Refill: 49 L · €80.85'), result.text);
  assert.ok(result.text.includes('Pump-price saving on this refill: €7.35'), result.text);
  assert.ok(result.text.includes('€5.80'), result.text);
  assert.equal(result.vehicle.fuels[0].capacity, 55);
  assert.ok(!result.text.includes('Comparison assumes'));
  assert.ok(!result.text.includes('full tank'));
});

test('reserve exclusion can make a formerly worthwhile trip cost more than it saves', async () => {
  const result = await renderComparison({ consumption: 10, price: 1.5, distance: 17.5,
    candidates: [[station('Nearby', 1.6), 0]] });
  // Raw 55 L would save €5.50 against €5.25 driving; 49 L saves only €4.90.
  assert.ok(result.text.includes('€0.35'), result.text);
  assert.ok(result.text.includes(en.settings.worth_break_even_over_capacity), result.text);
});

test('alternative selection also uses reserve-aware fill costs', async () => {
  const result = await renderComparison({ consumption: 10, price: 1.5, distance: 2,
    candidates: [[station('Closer', 1.6), 0], [station('Cheaper', 1.5), 17.5]] });
  assert.equal(result.reference, 'Closer', '€78.40 nearby beats €78.75 farther away after reserve is excluded');
});

test('refill cost remains visible without a nearby comparison', async () => {
  const result = await renderComparison({ capacity: 80, candidates: [] });
  assert.ok(result.text.includes('Refill: 70 L · €115.50'), result.text);
  assert.ok(result.text.includes('25'), result.text);
});

test('reachability excludes reserve and incompatible price units never produce a refill cost', async () => {
  const far = await renderComparison({ capacity: 40, consumption: 10, distance: 380 });
  assert.ok(far.text.includes(en.settings.worth_out_of_range), far.text);
  assert.ok(!far.reference);
  const lpg = await renderComparison({ fuel: 'lpg', source: 'PT' });
  assert.ok(lpg.text.includes(en.settings.worth_unit_mismatch), lpg.text);
  assert.ok(!lpg.text.includes('Refill:'));
});
