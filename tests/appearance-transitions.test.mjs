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
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    setTimeout: () => 1, clearTimeout: () => {},
    require: (name) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}

const tokens = await loadSource('../src/theme/tokens.ts');
const { PALETTES, PALETTE_ORDER } = await loadSource('../src/theme/palettes.ts', { './tokens': tokens });
const { STYLE_SETS, STYLE_SET_ORDER } = await loadSource('../src/theme/styles/sets.ts');
const walk = (node) => !node || typeof node !== 'object' ? []
  : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];

async function mountPicker(unlocked = true) {
  const slots = [];
  let cursor = 0, tree, dismissals = 0, backDismissals = 0;
  const applied = [];
  const slot = (factory) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = factory();
    return index;
  };
  const react = {
    forwardRef: component => component,
    useState: initial => {
      const index = slot(() => typeof initial === 'function' ? initial() : initial);
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef: initial => slots[slot(() => ({ current: initial }))],
    useCallback: callback => callback, useMemo: factory => factory(),
    useEffect: () => {}, useImperativeHandle: (ref, factory) => { ref.current = factory(); },
  };
  const support = {
    paletteId: 'default', iconSetId: 'ionicons', styleSetId: 'default',
    watchedCount: 0, rewardsLoaded: true, isUnlocked: () => unlocked,
    remainingFor: () => 0, watchAd: async () => ({ earned: false }),
    setPaletteId: id => { applied.push(['palette', id]); support.paletteId = id; },
    setIconSetId: id => { applied.push(['icon', id]); support.iconSetId = id; },
    setStyleSetId: id => { applied.push(['style', id]); support.styleSetId = id; },
  };
  const iconIds = ['ionicons', 'material', 'fontawesome', 'custom-svg'];
  const reward = id => ({ id });
  const { RewardsSheet } = await loadSource('../src/components/RewardsSheet.tsx', {
    react,
    'react-native': { Text: 'Text', View: 'View', TouchableOpacity: 'TouchableOpacity' },
    '@gorhom/bottom-sheet': { BottomSheetModal: 'Modal', BottomSheetScrollView: 'ScrollView', BottomSheetBackdrop: 'Backdrop' },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'expo-haptics': { selectionAsync: async () => {}, notificationAsync: async () => {}, NotificationFeedbackType: { Warning: 'warning' } },
    '../hooks/useSupport': { ALL_REWARDS: [], useSupport: () => support },
    '../hooks/useThemeTokens': { useThemeTokens: () => ({ colors: PALETTES.default.light }) },
    '../hooks/useAdRewards': { rewardForIcon: reward, rewardForPalette: reward, rewardForStyle: reward },
    '../hooks/useBottomSheetBackHandler': { useBottomSheetBackHandler: () => ({ handleSheetChange: () => {}, handleSheetDismiss: () => { backDismissals++; } }) },
    '../theme/palettes': { PALETTES, PALETTE_ORDER },
    '../theme/icons': { ICON_SET_ORDER: iconIds, ICON_SETS: Object.fromEntries(iconIds.map(id => [id, { labelKey: `icon.${id}`, render: () => null }])) },
    '../theme/styles': { STYLE_SETS, STYLE_SET_ORDER },
    '../theme/layout': {}, '../config/features': { MONETIZATION_ENABLED: false },
    './ui/SheetBackdrop': { SheetBackdrop: 'Backdrop' },
    './ui/button': { Button: 'Button' }, './ui/GlassBox': { GlassBox: 'GlassBox' }, './ui/SheetBackground': { SheetBackground: 'Background' },
  });
  const ref = { current: null };
  const modal = { present: () => {}, dismiss: () => { dismissals++; } };
  const render = () => {
    cursor = 0;
    tree = RewardsSheet({}, ref);
    tree.props.ref.current = modal;
  };
  const press = label => {
    const row = walk(tree).find(node => node.type === 'TouchableOpacity' && walk(node).some(child => child.type === 'Text' && child.props.children === label));
    assert.ok(row, `Missing appearance option ${label}`);
    row.props.onPress();
    render();
  };
  const dismiss = () => { tree.props.onDismiss(); render(); };
  render();
  return { press, dismiss, render, applied, support, ref,
    closing: () => { tree.props.onChange(-1); render(); },
    get dismissals() { return dismissals; }, get backDismissals() { return backDismissals; } };
}

for (const [kind, label, id] of [
  ['palette', 'settings.palette_midnight', 'midnight'],
  ['icon', 'icon.custom-svg', 'custom-svg'],
  ['style', 'settings.styleset_liquid-glass', 'liquid-glass'],
]) {
  test(`${kind} selection waits for full modal dismissal before updating mounted appearance`, async () => {
    const picker = await mountPicker();
    picker.press(label);
    assert.equal(picker.dismissals, 1);
    assert.deepEqual(picker.applied, [], 'must not mutate the closing sheet or its background');
    picker.closing();
    assert.deepEqual(picker.applied, [], 'onChange(-1) is not full dismissal');
    picker.dismiss();
    assert.deepEqual(picker.applied, [[kind, id]]);
    assert.equal(picker.backDismissals, 1);
    picker.dismiss();
    assert.equal(picker.applied.length, 1, 'a repeated dismiss must not replay selection');
  });
}

test('rapid picker taps commit only the last choice and reopening does not replay it', async () => {
  const picker = await mountPicker();
  picker.press('settings.styleset_retro');
  picker.press('settings.styleset_liquid-glass');
  picker.press('settings.styleset_default');
  assert.deepEqual(picker.applied, []);
  picker.dismiss();
  assert.deepEqual(picker.applied, [['style', 'default']]);
  picker.ref.current.present();
  picker.dismiss();
  assert.equal(picker.applied.length, 1);
});

test('closing without a selection and pressing a locked option do not change appearance', async () => {
  const picker = await mountPicker(false);
  picker.dismiss();
  picker.press('settings.styleset_liquid-glass');
  assert.equal(picker.dismissals, 0);
  picker.dismiss();
  assert.deepEqual(picker.applied, []);
});

test('tabs retain their backdrop and navigation registrations while hiding the startup bar', async () => {
  const native = { Platform: { OS: 'android' }, Pressable: 'Pressable', View: 'View' };
  const rules = await loadSource('../src/hooks/useStyleConfig.ts', { 'react-native': native });
  let activeStyle = 'default';
  const location = { locationHydrated: true };
  const { default: TabLayout } = await loadSource('../app/(tabs)/_layout.tsx', {
    react: { useRef: () => ({ current: null }) }, 'react-native': native,
    'expo-router/ui': { Tabs: 'Tabs', TabList: 'TabList', TabTrigger: 'TabTrigger', TabSlot: 'TabSlot' },
    'expo-blur': { BlurTargetView: 'BlurTarget' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '../../src/components/ui/icon': { Icon: 'Icon' },
    '../../src/components/ui/glass': { GlassBackdrop: 'Backdrop' },
    '../../src/hooks/useThemeTokens': { useThemeTokens: () => ({ colors: PALETTES.default.light }) },
    '../../src/hooks/useSupport': { useAppearanceSupport: () => ({ styleRules: STYLE_SETS[activeStyle] }) },
    '../../src/hooks/useStyleConfig': rules,
    '../../src/hooks/useApp': { useLocationState: () => location },
    '../../src/theme/layout': { TAB_BAR_HEIGHT: 64, TAB_BAR_H_MARGIN: 16, TAB_BAR_FLOAT_GAP: 8 },
  });
  for (const style of ['default', 'retro', 'liquid-glass', 'dotted', 'liquid-glass', 'default']) {
    activeStyle = style;
    const tabList = walk(TabLayout()).find(node => node.type === 'TabList');
    const shape = Object.assign({}, ...tabList.props.style);
    assert.equal(shape.isolation, 'isolate');
    assert.equal(walk(tabList).filter(node => node.type === 'TabTrigger').length, 5);
    if (style === 'liquid-glass') {
      assert.equal(tabList.props.children[0].type, 'Backdrop');
      assert.equal(tabList.props.children[0].props.borderRadius, 32);
      assert.equal(shape.overflow, 'visible');
    }
  }
  for (const [hydrated, display] of [
    [false, 'none'],
    [true, 'flex'], // Navigation is usable even with an empty map during sync.
  ]) {
    location.locationHydrated = hydrated;
    const tree = TabLayout();
    const bar = walk(tree).find(node => node.type === 'TabList');
    assert.equal(Object.assign({}, ...bar.props.style).display, display);
    assert.equal(walk(bar).filter(node => node.type === 'TabTrigger').length, 5);
    assert.equal(walk(tree).filter(node => node.type === 'TabSlot').length, 1);
  }
});
