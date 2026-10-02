import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function loadSource(relative, dependencies = {}) {
  const source = await readFile(new URL(relative, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: false },
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

// Exercise the real sheet's controls with native UI adapters. State persists
// between renders; modal dismissal is explicit so Apply timing is observable.
async function mountSheet(kind = 'FilterSheet', initial = {}, showSort = true) {
  const slots = [];
  let cursor = 0;
  const slot = (factory) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = factory();
    return index;
  };
  const jsx = (type, props) => ({ type, props });
  const ref = { current: null };
  let tree;
  let dismissals = 0;
  const applied = [];
  const modal = { present: () => {}, dismiss: () => { dismissals += 1; } };
  const native = Object.fromEntries(['Text', 'TextInput', 'TouchableOpacity', 'View'].map((name) => [name, name]));
  const { PUBLISHED_FUEL_KEYS } = await loadSource('../src/api/siphonClient.ts', { './rateLimit': {} });
  const sharedBackdrop = await loadSource('../src/components/ui/SheetBackdrop.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@gorhom/bottom-sheet': { BottomSheetBackdrop: 'Backdrop' },
  });
  const dependencies = {
    react: {
      forwardRef: (component) => component,
      useState: (initialValue) => {
        const index = slot(() => typeof initialValue === 'function' ? initialValue() : initialValue);
        return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
      },
      useRef: (initialValue) => slots[slot(() => ({ current: initialValue }))],
      useMemo: (factory) => factory(), useCallback: (callback) => callback,
      useImperativeHandle: (target, factory) => { target.current = factory(); },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': native,
    'expo-haptics': { selectionAsync: async () => {}, impactAsync: async () => {}, ImpactFeedbackStyle: { Light: 'light' } },
    '@gorhom/bottom-sheet': { BottomSheetModal: 'Modal', BottomSheetScrollView: 'ScrollView', BottomSheetBackdrop: 'Backdrop' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'react-i18next': { useTranslation: () => ({ t: (key, options) => options?.max ? `${key}:${options.max}` : key }) },
    '../hooks/useThemeTokens': { useThemeTokens: () => ({ colors: {} }) },
    '../hooks/useBottomSheetBackHandler': { useBottomSheetBackHandler: () => ({ handleSheetChange: () => {}, handleSheetDismiss: () => {} }) },
    '../theme/layout': {},
    '../utils/fuelNames': { FUEL_KEYS: PUBLISHED_FUEL_KEYS, fuelLabel: (key) => `fuel.${key}` },
    './ui/FilterButton': { FilterButton: 'FilterButton' },
    './ui/GlassBox': { GlassBox: 'GlassBox' },
    './ui/field': { Field: 'Field' },
    './ui/SheetBackground': { SheetBackground: 'Background' },
    './ui/SheetBackdrop': sharedBackdrop,
    '../utils/vehicles': await loadSource('../src/utils/vehicles.ts'),
  };
  const exports = await loadSource(`../src/components/${kind}.tsx`, dependencies);
  const props = kind === 'FilterSheet'
    ? { searchFilter: initial, showSort, onApply: (filters) => applied.push(JSON.parse(JSON.stringify(filters))) }
    : { onSave: () => {}, onRemove: () => {} };
  const walk = (node) => !node || typeof node !== 'object' ? []
    : Array.isArray(node) ? node.flatMap((child) => walk(child))
    : [node, ...walk(node.props?.children)];
  const nodes = () => walk(tree);
  const render = () => {
    cursor = 0;
    tree = exports[kind](props, ref);
    nodes().find((node) => node.type === 'Modal').props.ref.current = modal;
  };
  const choices = (label) => nodes().filter((node) => node.type === 'FilterButton' && node.props.label === label);
  const press = (label, index = 0) => {
    const choice = choices(label)[index];
    assert.ok(choice, `Missing choice: ${label}`);
    if (!choice.props.disabled) choice.props.onPress();
    render();
  };
  const action = (label) => {
    const node = nodes().find((node) => node.type === 'TouchableOpacity' && node.props.accessibilityLabel === label);
    assert.ok(node, `Missing action: ${label}`);
    node.props.onPress();
    render();
  };
  const dismiss = () => { tree.props.onDismiss(); render(); };
  render();
  return { render, nodes, choices, press, action, dismiss, ref, props, applied,
    backdrop: () => tree.props.backdropComponent({ animatedIndex: { value: 0 }, animatedPosition: { value: 0 } }),
    get dismissals() { return dismissals; } };
}

test('country and fuel choices retain multiple selection and Any resets it', async () => {
  const sheet = await mountSheet();
  sheet.press('search.portugal');
  sheet.press('search.spain');
  assert.equal(sheet.choices('search.portugal')[0].props.selected, true);
  assert.equal(sheet.choices('search.spain')[0].props.selected, true);
  assert.equal(sheet.choices('search.portugal')[0].props.multiSelect, true);
  sheet.press('fuel.gasoline95');
  sheet.press('fuel.diesel');
  assert.equal(sheet.choices('fuel.gasoline95')[0].props.selected, true);
  assert.equal(sheet.choices('fuel.diesel')[0].props.selected, true);
  sheet.press('search.any_country');
  sheet.press('search.any_fuel');
  assert.equal(sheet.choices('search.any_country')[0].props.selected, true);
  assert.equal(sheet.choices('search.any_fuel')[0].props.selected, true);
});

test('price and distance choices toggle off and city entry is applied after dismissal', async () => {
  const sheet = await mountSheet();
  sheet.press('search.under:1.87');
  sheet.press('search.under:1.87');
  assert.equal(sheet.choices('search.any_price')[0].props.selected, true);
  sheet.press('25 km');
  sheet.press('25 km');
  assert.equal(sheet.choices('search.any_distance')[0].props.selected, true);
  sheet.press('search.under:2.00');
  sheet.press('10 km');
  sheet.nodes().find((node) => node.type === 'TextInput').props.onChangeText('Lisboa');
  sheet.render();
  sheet.action('search.apply');
  assert.equal(sheet.dismissals, 1);
  assert.equal(sheet.applied.length, 0, 'Apply waits for the sheet to close');
  sheet.dismiss();
  assert.deepEqual(sheet.applied, [{ priceRange: { max: 2 }, maxDistance: 10, city: 'Lisboa' }]);
});

test('price sorting follows selected fuels and falls back when the sorting fuel is removed', async () => {
  const sheet = await mountSheet();
  sheet.press('fuel.gasoline95');
  sheet.press('fuel.diesel');
  sheet.press('search.sort_cheapest');
  sheet.press('fuel.diesel', 1); // conditional sort-fuel row
  sheet.press('fuel.diesel', 0); // remove it from available fuels
  assert.equal(sheet.choices('fuel.diesel').length, 1);
  assert.equal(sheet.choices('fuel.gasoline95')[1].props.selected, true);
  sheet.action('search.apply');
  sheet.dismiss();
  assert.deepEqual(sheet.applied[0], { fuelTypes: ['gasoline95'], sortBy: 'price', sortByFuel: 'gasoline95' });
});

test('dismissal discards edits and reopening restores current filters including secondary fuels', async () => {
  const sheet = await mountSheet();
  sheet.press('search.portugal');
  sheet.dismiss();
  assert.equal(sheet.applied.length, 0);
  sheet.props.searchFilter = { fuelTypes: ['hydrogen'], countries: ['ES'] };
  sheet.render();
  sheet.ref.current.present();
  sheet.render();
  assert.equal(sheet.choices('search.portugal')[0].props.selected, false);
  assert.equal(sheet.choices('search.spain')[0].props.selected, true);
  assert.equal(sheet.choices('fuel.hydrogen')[0].props.selected, true);
});

test('map filters hide sorting and Clear preserves its existing sort settings', async () => {
  const sheet = await mountSheet('FilterSheet', { countries: ['PT'], sortBy: 'price', sortByFuel: 'diesel' }, false);
  assert.equal(sheet.choices('search.sort_cheapest').length, 0);
  sheet.action('search.clear_filters');
  sheet.action('search.apply');
  sheet.dismiss();
  assert.deepEqual(sheet.applied[0], { sortBy: 'price', sortByFuel: 'diesel' });
});

test('vehicle fuel choices preserve the two-fuel limit and require at least one fuel', async () => {
  const sheet = await mountSheet('VehicleSheet');
  sheet.press('fuel.gasoline95');
  assert.equal(sheet.choices('fuel.gasoline95')[0].props.selected, true);
  sheet.press('fuel.diesel');
  assert.equal(sheet.choices('fuel.gasoline98')[0].props.disabled, true);
  assert.equal(sheet.choices('fuel.diesel')[0].props.disabled, false);
  sheet.press('fuel.gasoline98');
  assert.equal(sheet.choices('fuel.gasoline98')[0].props.selected, false);
  sheet.press('fuel.diesel');
  assert.equal(sheet.choices('fuel.gasoline98')[0].props.disabled, false);
});

test('filter backdrop taps cannot close the sheet or discard pending choices', async () => {
  const sheet = await mountSheet();
  let closes = 0;
  const jsx = (type, props) => ({ type, props });
  const { BottomSheetBackdrop } = await loadSource('../node_modules/@gorhom/bottom-sheet/src/components/bottomSheetBackdrop/BottomSheetBackdrop.tsx', {
    react: {
      memo: (component) => component, useCallback: (callback) => callback, useMemo: (factory) => factory(),
      useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}], useEffect: (effect) => { effect(); },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { StyleSheet: { absoluteFill: {} } },
    'react-native-gesture-handler': {
      GestureDetector: 'GestureDetector',
      Gesture: { Tap: () => ({ onEnd(callback) { this.tap = callback; return this; } }) },
    },
    'react-native-reanimated': {
      default: { View: 'AnimatedView' }, Extrapolation: { CLAMP: 'clamp' },
      interpolate: () => 0, runOnJS: (callback) => callback, useAnimatedReaction: () => {}, useAnimatedStyle: (factory) => factory(),
    },
    '../../hooks': { useBottomSheet: () => ({ close: () => { closes += 1; }, snapToIndex: () => {} }) },
    './constants': await loadSource('../node_modules/@gorhom/bottom-sheet/src/components/bottomSheetBackdrop/constants.ts'),
    './styles': { styles: {} },
  });
  const tap = (props) => {
    const backdrop = BottomSheetBackdrop(props);
    if (backdrop.type === 'GestureDetector') backdrop.props.gesture.tap();
  };
  // Establish the installed library's default tap-to-close behavior first.
  const initialProps = sheet.backdrop().props;
  tap({ ...initialProps, pressBehavior: undefined });
  assert.equal(closes, 1);
  sheet.press('search.portugal');
  tap(sheet.backdrop().props);
  assert.equal(closes, 1, 'the filter backdrop must not invoke close');
  assert.equal(sheet.applied.length, 0);
  assert.equal(sheet.choices('search.portugal')[0].props.selected, true);
  sheet.action('search.apply');
  sheet.dismiss();
  assert.deepEqual(sheet.applied[0], { countries: ['PT'] });
});


test('every bottom sheet uses the shared non-dismissing backdrop', async () => {
  const directory = new URL('../src/components/', import.meta.url);
  let sheets = 0;
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.tsx')) continue;
    const source = await readFile(new URL(name, directory), 'utf8');
    const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const inspect = node => {
      if (ts.isJsxOpeningElement(node) && node.tagName.getText(ast) === 'BottomSheetModal') {
        sheets++;
        const attribute = node.attributes.properties.find(prop => prop.name?.getText(ast) === 'backdropComponent');
        assert.equal(attribute?.initializer?.expression?.getText(ast), 'SheetBackdrop', name);
        assert.ok(source.includes("import { SheetBackdrop } from './ui/SheetBackdrop'"), name);
      }
      ts.forEachChild(node, inspect);
    };
    inspect(ast);
  }
  assert.equal(sheets, 9, 'cover the complete current sheet inventory');
});
