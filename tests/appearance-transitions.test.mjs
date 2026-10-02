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
  let cursor = 0, tree, dismissals = 0, backDismissals = 0, imports = 0;
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
    paletteId: 'default', iconSetId: 'ionicons', styleSetId: 'default', densityId: 'comfortable',
    watchedCount: 0, rewardsLoaded: true, isUnlocked: () => unlocked,
    remainingFor: () => 0, watchAd: async () => ({ earned: false }),
    setPaletteId: id => { applied.push(['palette', id]); support.paletteId = id; },
    setIconSetId: id => { applied.push(['icon', id]); support.iconSetId = id; },
    setDensityId: id => { applied.push(['density', id]); support.densityId = id; },
    setStyleSetId: id => { applied.push(['style', id]); support.styleSetId = id; },
  };
  const iconIds = ['lucide', 'ionicons', 'material', 'fontawesome', 'custom-svg'];
  const reward = id => ({ id });
  const { RewardsSheet } = await loadSource('../src/components/RewardsSheet.tsx', {
    react,
    'react-native': { Text: 'Text', View: 'View', TouchableOpacity: 'TouchableOpacity' },
    '@gorhom/bottom-sheet': { BottomSheetModal: 'Modal', BottomSheetScrollView: 'ScrollView', BottomSheetBackdrop: 'Backdrop' },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'expo-haptics': { selectionAsync: async () => {}, notificationAsync: async () => {}, NotificationFeedbackType: { Warning: 'warning' } },
    '../hooks/useSupport': { ALL_REWARDS: [], useSupport: () => support },
    '../hooks/useAppearanceLayout': { useAppearanceLayout: () => ({space:{xs:4,sm:8,md:12,lg:16,xl:20,xxl:24,xxxl:32}}) },
    '../hooks/useThemeTokens': { useThemeTokens: () => ({ colors: PALETTES.default.light }) },
    '../hooks/useAdRewards': { rewardForIcon: reward, rewardForPalette: reward, rewardForStyle: reward },
    '../hooks/useBottomSheetBackHandler': { useBottomSheetBackHandler: () => ({ handleSheetChange: () => {}, handleSheetDismiss: () => { backDismissals++; } }) },
    '../theme/appearance': { appearancePalette: palette => palette },
    '../theme/palettes': { PALETTES, PALETTE_ORDER },
    '../theme/icons': { ICON_SET_ORDER: iconIds, ICON_SETS: Object.fromEntries(iconIds.map(id => [id, { labelKey: `icon.${id}`, render: () => null }])) },
    '../theme/styles': { STYLE_SETS, STYLE_SET_ORDER },
    '../theme/layout': {}, '../config/features': { MONETIZATION_ENABLED: false },
    './CustomIconsSheet': { CustomIconsSheet: 'CustomIconsSheet' },
    './ui/SheetBackdrop': { SheetBackdrop: 'Backdrop' },
    './ui/button': { Button: 'Button' }, './ui/GlassBox': { GlassBox: 'GlassBox' }, './ui/SheetBackground': { SheetBackground: 'Background' },
  });
  const ref = { current: null };
  const modal = { present: () => {}, dismiss: () => { dismissals++; } };
  const render = () => {
    cursor = 0;
    const root = RewardsSheet({}, ref);
    tree = walk(root).find(node => node.type === 'Modal');
    assert.equal(tree.props.accessible, false, 'native accessibility must expose individual appearance options');
    const importer = root.props.children.find(node => node.type === 'CustomIconsSheet');
    assert.ok(importer, 'import sheet must remain mounted after its sibling picker dismisses');
    importer.props.ref.current = { present: () => { imports++; } };
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
    get imports() { return imports; }, get labels() { return walk(tree).filter(n=>n.type==='TouchableOpacity').map(n=>walk(n).find(c=>c.type==='Text')?.props.children); }, get dismissals() { return dismissals; }, get backDismissals() { return backDismissals; } };
}

for (const [kind, label, id] of [
  ['palette', 'settings.palette_midnight', 'midnight'],
  ['icon', 'icon.material', 'material'],
  ['style', 'settings.styleset_frosted', 'frosted'],
  ['density', 'settings.density_compact', 'compact'],
]) {
  test(`${kind} selection applies immediately while the picker stays open`, async () => {
    const picker = await mountPicker();
    picker.press(label);
    assert.equal(picker.dismissals, 0);
    assert.deepEqual(picker.applied, [[kind, id]]);
    picker.dismiss();
    assert.deepEqual(picker.applied, [[kind, id]], 'dismissal must not replay selection');
    assert.equal(picker.backDismissals, 1);
  });
}

test('several changes apply during the same visit and reopening does not replay them', async () => {
  const picker = await mountPicker();
  picker.press('settings.styleset_quiet');
  picker.press('settings.styleset_frosted');
  picker.press('settings.palette_midnight');
  picker.press('settings.density_compact');
  assert.deepEqual(picker.applied, [['style', 'quiet'], ['style', 'frosted'], ['palette', 'midnight'], ['density', 'compact']]);
  assert.equal(picker.dismissals, 0);
  picker.dismiss();
  picker.ref.current.present();
  picker.dismiss();
  assert.equal(picker.applied.length, 4);
});

test('closing without a selection and pressing a locked option do not change appearance', async () => {
  const picker = await mountPicker(false);
  picker.dismiss();
  picker.press('settings.styleset_frosted');
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
  for (const style of ['default', 'quiet', 'frosted', 'quiet', 'frosted', 'default']) {
    activeStyle = style;
    const tabList = walk(TabLayout()).find(node => node.type === 'TabList');
    const shape = Object.assign({}, ...tabList.props.style);
    assert.equal(shape.isolation, 'isolate');
    assert.equal(walk(tabList).filter(node => node.type === 'TabTrigger').length, 5);
    if (style === 'frosted') {
      assert.equal(tabList.props.children[0].type, 'Backdrop');
      assert.equal(tabList.props.children[0].props.borderRadius, 32);
      assert.equal(shape.overflow, 'visible');
    }
  }
  const favorite = walk(TabLayout()).find(node => node.type === 'TabTrigger' && node.props.name === 'favorites').props.children;
  for (const [isFocused, name] of [[false, 'star'], [true, 'star.fill']]) {
    const item = favorite.type({ ...favorite.props, isFocused });
    assert.equal(walk(item).find(node => node.type === 'Icon').props.name, name);
    assert.equal(item.props.accessibilityState.selected, isFocused);
    assert.equal(walk(item).find(node => node.type === 'Icon').props.filled, isFocused);
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


test('custom SVG option opens its sibling importer while retaining the appearance picker', async () => {
  const picker=await mountPicker();picker.press('icon.custom-svg');
  assert.equal(picker.imports,1);assert.equal(picker.dismissals,0);assert.deepEqual(picker.applied,[]);
  picker.dismiss();assert.equal(picker.imports,1);
});

test('appearance picker puts each section default first', async () => {
  const picker=await mountPicker();
  assert.equal(picker.labels.filter(label=>label.startsWith('settings.palette_'))[0],'settings.palette_default');
  assert.equal(picker.labels.filter(label=>label.startsWith('icon.'))[0],'icon.lucide');
  assert.equal(picker.labels.filter(label=>label.startsWith('settings.styleset_'))[0],'settings.styleset_quiet');
  assert.equal(picker.labels.filter(label=>label.startsWith('settings.density_'))[0],'settings.density_compact');
});


test('light/dark choices update immediately and keep the theme sheet open until Done', async () => {
  const slots=[];let cursor=0, selected='system',dismissals=0;
  const changes=[];
  const react={forwardRef:c=>c,useRef:initial=>slots[cursor++]??(slots[cursor-1]={current:initial}),useMemo:f=>f(),useCallback:f=>f,useImperativeHandle:(ref,f)=>{ref.current=f();}};
  const {ThemeSheet}=await loadSource('../src/components/ThemeSheet.tsx',{
    react,'react-native':{Text:'Text',TouchableOpacity:'TouchableOpacity',View:'View'},
    '@gorhom/bottom-sheet':{BottomSheetModal:'Modal',BottomSheetScrollView:'Scroll'},
    'expo-haptics':{selectionAsync:async()=>{}},'react-i18next':{useTranslation:()=>({t:key=>key})},
    'react-native-safe-area-context':{useSafeAreaInsets:()=>({bottom:0})},
    '../hooks/useAppearanceLayout':{useAppearanceLayout:()=>({space:{lg:12}})},
    '../hooks/useThemeTokens':{useThemeTokens:()=>({colors:PALETTES.default.light})},
    '../hooks/useBottomSheetBackHandler':{useBottomSheetBackHandler:()=>({handleSheetChange:()=>{},handleSheetDismiss:()=>{}})},
    '../theme/layout':{},'./ui/SheetBackground':{},'./ui/SheetBackdrop':{},'./ui/button':{Button:'Button'},
  });
  const ref={current:null};
  const render=()=>{cursor=0;return ThemeSheet({currentTheme:selected,onSelectTheme:pref=>{changes.push(pref);selected=pref;},onDismiss:()=>{}},ref);};
  let tree=render();tree.props.ref.current={present:()=>{},dismiss:()=>{dismissals++;}};
  assert.equal(tree.props.accessible,false,'native accessibility must expose individual theme options');
  for(const value of ['dark','light','system']){
    walk(tree).find(n=>n.type==='TouchableOpacity'&&walk(n).some(c=>c.props?.children===`settings.theme_${value}`)).props.onPress();
    tree=render();
    assert.equal(walk(tree).filter(n=>n.type==='TouchableOpacity'&&n.props.accessibilityState.selected).length,1);
    assert.equal(dismissals,0);
  }
  assert.deepEqual(changes,['dark','light','system']);
  walk(tree).find(n=>n.type==='Button').props.onPress();assert.equal(dismissals,1);
});
