import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource, deferred } from './helpers/loadSource.mjs';
import { hookHarness } from './helpers/hooks.mjs';

const tokens = await loadSource('src/theme/tokens.ts');
const { PALETTES } = await loadSource('src/theme/palettes.ts', { './tokens': tokens });
const styles = await loadSource('src/theme/styles/sets.ts');
const density = await loadSource('src/theme/density.ts');
const appearance = await loadSource('src/theme/appearance.ts');

function rgba(value) {
  if (value.startsWith('#')) return [...value.slice(1).matchAll(/../g)].map(v => parseInt(v[0],16)).concat(1);
  return value.match(/[\d.]+/g).map(Number);
}
function composite(foreground, background) {
  const f=rgba(foreground),b=rgba(background);
  return f.slice(0,3).map((v,i)=>v*f[3]+b[i]*(1-f[3]));
}
function luminance(rgb) {
  return rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
}
function contrast(foreground, background) {
  const a=luminance(composite(foreground,background)),b=luminance(rgba(background).slice(0,3));
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}

test('styles migrate saved choices without exposing removed options', () => {
  assert.equal(styles.STYLE_SET_ORDER.join(','),'quiet,default,frosted');
  for(const [old,current] of [['liquid-glass','frosted'],['retro','quiet'],['instrument','quiet'],['dotted','quiet'],['invalid','quiet'],[null,'quiet']]) {
    assert.equal(styles.normalizeStyleSet(old),current);
  }
});

test('every style and palette retains readable content in both appearances and preserves price semantics', () => {
  for(const [id,palette] of Object.entries(PALETTES)) for(const style of styles.STYLE_SET_ORDER) {
    const resolved=appearance.appearancePalette(palette,style);
    for(const scheme of ['light','dark']) {
      const c=resolved[scheme];
      for(const key of ['priceLow','priceMid','priceHigh','worthItText','notWorthText','markerOpen','markerClosed']) assert.equal(c[key],palette[scheme][key]);
      if(style !== 'default') {
        const selected=composite(appearance.selectionBackground(c),c.fieldBackground).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
        assert.ok(contrast(c.labelOnTint,'#'+selected)>=4.5,`${id}/${style}/${scheme}: selected text`);
        if (scheme === 'light') assert.ok(contrast(appearance.selectionBackground(c),c.groupedBackground)>=3, `${id}/${style}: selection against unselected chip`);
      }
      for(const text of ['label','secondaryLabel','tertiaryLabel','placeholder','tint','priceLow','priceMid','priceHigh']) {
        for(const bg of ['background','surface','sheet','fieldBackground','groupedBackground']) {
          assert.ok(contrast(c[text],c[bg])>=4.5,`${id}/${style}/${scheme}: ${text} on ${bg}`);
        }
      }
    }
  }
});

test('Density keeps numeric typography readable across all styles', async () => {
  for(const key of Object.keys(density.DENSITIES.comfortable)) assert.ok(density.DENSITIES.compact[key]<density.DENSITIES.comfortable[key]);
  for(const styleSetId of styles.STYLE_SET_ORDER) for(const densityId of ['comfortable','compact']) {
    const { useAppearanceLayout }=await loadSource('src/hooks/useAppearanceLayout.ts', {
      'react-native': { Platform:{OS:'android'} },
      './useSupport': { useAppearanceSupport:()=>({ styleSetId,densityId }) },
      '../theme/density': density,
      '../theme/styles': styles,
    });
    const layout=useAppearanceLayout();
    assert.equal(layout.numericStyle.fontSize,undefined);
    assert.equal(layout.numericStyle.fontFamily,undefined);
    assert.equal(layout.space.md,density.DENSITIES[densityId].md);
  }
});

test('a density selection during startup wins over delayed saved hydration and persists', async () => {
  const hooks=hookHarness(),read=deferred(),writes=[];
  const {useDensity}=await loadSource('src/hooks/useDensity.ts', {
    react:hooks.react,
    '@react-native-async-storage/async-storage': {default:{getItem:()=>read.promise,setItem:async(...args)=>writes.push(args)}},
    '../theme/density':density,
  });
  const render=()=>hooks.render(useDensity);
  const initial=render();hooks.flushEffects();
  assert.equal(initial.densityId,'compact');
  initial.setDensityId('comfortable');read.resolve('compact');await new Promise(r=>setImmediate(r));
  assert.equal(render().densityId,'comfortable');
  assert.deepEqual(writes,[['siphon:density','comfortable']]);
});

test('Frosted only blurs overlays; cards, fuel badges and editable fields stay opaque', () => {
  const rules=styles.STYLE_SETS.frosted;
  assert.equal(rules.sheet.glass,true);assert.equal(rules.tabBar.glass,true);
  for(const part of ['card','stationCard','badge','chip','input','listItem']) assert.notEqual(rules[part].glass,true);
});

test('Lucide resolves the app symbol vocabulary and preserves size, color and favorite state', async () => {
  const names=['ArrowDown','ArrowUp','ArrowRight','Map','List','Search','Star','Settings','LocateFixed','SlidersHorizontal','Navigation','Copy','Info','Flag','GitBranch','Coffee','LockKeyhole','Gift','ChartNoAxesColumnIncreasing'];
  const {render}=await loadSource('src/theme/icons/sets/lucide.tsx',{...Object.fromEntries(names.map(n=>['lucide-react-native/icons/'+n.replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase(),{default:n}])), 'react-native-svg': { default:'Svg', Path:'Path', Rect:'Rect' }});
  const aliases=['arrow.down','arrow.up','arrow.right','map.fill','map','list.bullet','list','magnifyingglass','search','star','star.fill','star_border','gearshape.fill','settings','my_location','filter_list','directions','copy','flag','github','kofi','lock','gift','oilcan.fill'];
  for(const name of aliases){const icon=render({name,size:19,color:'#123456',filled:false});assert.notEqual(icon.type,'Info',name);assert.equal(icon.props.size,19);assert.equal(icon.props.color,'#123456');}
  assert.equal(render({name:'star'}).props.fill,'none');
  assert.equal(render({name:'star.fill',color:'#123456'}).props.fill,'#123456');
  for (const name of ['map.fill','gearshape.fill','oilcan.fill','magnifyingglass']) {
    const outlined=render({name,color:'#123456',filled:false});
    const solid=render({name,color:'#123456',filled:true});
    assert.equal(outlined.props.fill,'none');assert.equal(solid.type,'Svg');
    assert.equal(solid.props.fill,'#123456');assert.ok(solid.props.children);
  }
});

const iconRegistry = await loadSource('src/theme/icons/index.ts', Object.fromEntries(
  ['ionicons', 'material', 'fontawesome', 'custom-svg', 'lucide'].map(id => [`./sets/${id}`, { render: () => null }]),
));

test('new installations default to Minimal, Compact and Lucide while saved preferences survive', async () => {
  assert.equal(iconRegistry.ICON_SET_ORDER[0], iconRegistry.DEFAULT_ICON_SET);
  assert.equal(styles.STYLE_SET_ORDER[0], styles.DEFAULT_STYLE_SET);
  const preferences = [
    ['src/hooks/useStyleSet.ts', '../theme/styles', styles, 'useStyleSet', 'styleSetId', 'quiet', [[null,'quiet'],['bad','quiet'],['instrument','quiet'],['default','default'],['frosted','frosted']]],
    ['src/hooks/useDensity.ts', '../theme/density', density, 'useDensity', 'densityId', 'compact', [[null,'compact'],['bad','compact'],['comfortable','comfortable']]],
    ['src/hooks/useIconSet.ts', '../theme/icons', iconRegistry, 'useIconSet', 'iconSetId', 'lucide', [[null,'lucide'],['bad','lucide'],['ionicons','ionicons'],['custom-svg','custom-svg']]],
  ];
  for (const [file, dependency, registry, hookName, key, initial, cases] of preferences) {
    for (const [saved, expected] of cases) {
      const hooks = hookHarness();
      const hooksModule = await loadSource(file, {
        react: hooks.react,
        [dependency]: registry,
        '@react-native-async-storage/async-storage': { default: { getItem: async () => saved, setItem: async () => {} } },
      });
      const render = () => hooks.render(hooksModule[hookName]);
      assert.equal(render()[key], initial);
      hooks.flushEffects();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(render()[key], expected, `${key}: ${saved}`);
    }
  }
});

test('shared filters restore 28px chips in Compact and retain 44px chips in Comfortable, including Market', async () => {
  let densityId = 'compact';
  const colors = appearance.appearancePalette(PALETTES.default, 'quiet').light;
  const support = { styleSetId: 'quiet', styleRules: styles.STYLE_SETS.quiet };
  const useLayout = () => ({ space: density.DENSITIES[densityId], compact: densityId === 'compact' });
  const rules = await loadSource('src/hooks/useStyleConfig.ts', { 'react-native': { Platform: { OS: 'ios' } } });
  const { Chip } = await loadSource('src/components/ui/chip.tsx', {
    'react-native': { TouchableOpacity: 'TouchableOpacity' },
    '../../hooks/useThemeTokens': { useThemeTokens: () => ({ colors }) },
    '../../hooks/useSupport': { useAppearanceSupport: () => support },
    '../../hooks/useAppearanceLayout': { useAppearanceLayout: useLayout },
    '../../hooks/useStyleConfig': rules,
    '../../theme/appearance': appearance,
    './glass': { GlassBackdrop: 'GlassBackdrop' },
  });
  const { FilterButton } = await loadSource('src/components/ui/FilterButton.tsx', {
    'react-native': { Text: 'Text' }, './chip': { Chip },
    '../../hooks/useSupport': { useAppearanceSupport: () => support },
    '../../hooks/useThemeTokens': { useThemeTokens: () => ({ colors }) },
  });
  const { MarketFilters } = await loadSource('src/components/MarketFilters.tsx', {
    'react-native': { View: 'View' },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'expo-haptics': {},
    '../hooks/useAppearanceLayout': { useAppearanceLayout: useLayout },
    '../hooks/useThemeTokens': { useThemeTokens: () => ({ colors }) },
    '../utils/fuelNames': { fuelLabel: key => key }, './ui/FilterButton': { FilterButton },
  });
  for (const [id, height] of [['compact',28], ['comfortable',44]]) {
    densityId = id;
    for (const selected of [false, true]) {
      const control = Chip(FilterButton({ label: 'Diesel Premium', selected, onPress: () => {} }).props);
      assert.equal(Object.assign({}, ...control.props.style).minHeight, height);
      assert.equal(control.props.accessibilityState.selected, selected);
      assert.equal(hookHarness().walk(control).find(node => node.type === 'Text').props.style.fontSize, 12);
    }
    const market = MarketFilters({ country: 'pt', fuel: 'diesel', onCountryChange: () => {}, onFuelChange: () => {} });
    const groups = market.props.children.map(node => node.type(node.props));
    const chips = groups.flatMap(group => group.props.children.map(node => Chip(FilterButton(node.props).props)));
    assert.equal(chips.length, 5);
    assert.ok(chips.every(chip => Object.assign({}, ...chip.props.style).minHeight === height));
    assert.equal(market.props.style.marginBottom, density.DENSITIES[id].md);
  }
});

test('bottom-sheet portal content inherits appearance variables and the app blur target', async () => {
  const variables = { '--space-md': '8px', '--color-surface': '#fff' };
  const { default: RootLayout } = await loadSource('app/_layout.tsx', {
    '../global.css': {},
    react: { useRef: value => ({ current: value }), useEffect: () => {} },
    'expo-router': { Stack: { Screen: 'Screen' } }, 'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native': { View: 'View' }, 'react-native-gesture-handler': { GestureHandlerRootView: 'GestureRoot' },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeArea' },
    '@gorhom/bottom-sheet': { BottomSheetModalProvider: 'SheetPortalProvider' },
    'expo-blur': { BlurTargetView: 'BlurTarget' }, nativewind: {},
    '@react-native-async-storage/async-storage': {}, 'expo-system-ui': {},
    '../src/components/StationDetailSheet': { StationDetailSheet: 'StationSheet' },
    '../src/hooks/useApp': { AppProvider: 'AppProvider' },
    '../src/hooks/useSupport': { SupportProvider: 'SupportProvider', useAppearanceSupport: () => ({ paletteVariables: variables }) },
    '../src/hooks/useAppUpdate': {}, '../src/hooks/useThemeTokens': { useThemeTokens: () => ({ colors: { background: '#121619', label: '#EFF2F4' }, scheme: 'dark' }) },
    '../src/components/ui/glass': { AppBlurTargetProvider: 'AppBlurProvider' }, '../src/i18n': {},
  });
  const { walk } = hookHarness();
  const outer = RootLayout();
  assert.equal(walk(outer).filter(node => node.type === 'SheetPortalProvider').length, 0);
  const appContent = walk(outer).find(node => node.type?.name === 'AppContent');
  const themedRoot = appContent.type(appContent.props);
  assert.equal(themedRoot.props.style, variables);
  assert.equal(walk(themedRoot).find(node => node.type === 'StatusBar').props.style, 'light');
  assert.equal(walk(themedRoot).find(node => node.props?.screenOptions).props.screenOptions.headerStyle.backgroundColor, '#121619');
  const blurProvider = walk(themedRoot).find(node => node.type === 'AppBlurProvider');
  const portal = walk(blurProvider).find(node => node.type === 'SheetPortalProvider');
  assert.ok(portal);
  assert.equal(walk(portal).filter(node => node.type === 'StationSheet').length, 1);
  assert.equal(walk(portal).find(node => node.type === 'BlurTarget').props.ref, blurProvider.props.target);
});

test('station popup shrinks its initial snap and footer spacing in Compact while retaining safe-area clearance', async () => {
  const hooks = hookHarness();
  let densityId = 'compact';
  const station = { properties: { id:'pt-1', fuels:{ gasoline95:1.649, diesel:1.539, gasoline98:1.779, dieselPremium:1.659 } } };
  const { StationDetailSheet } = await loadSource('src/components/StationDetailSheet.tsx', {
    react: hooks.react,
    'react-native': { View:'View', Text:'Text', TouchableOpacity:'TouchableOpacity', Pressable:'Pressable' },
    'expo-router': {}, '@gorhom/bottom-sheet': { BottomSheetModal:'Modal', BottomSheetScrollView:'Scroll' },
    'react-i18next': { useTranslation:() => ({ t:key => key }) }, 'expo-clipboard': {},
    'react-native-reanimated': {}, 'react-native-safe-area-context': { useSafeAreaInsets:() => ({ top:0, bottom:34 }) },
    '../utils/fuelNames': {}, '../utils/schedule': {}, '../utils/stationLabels': {}, '../utils/location': {},
    '../theme/Icon': {}, '../hooks/useApp': {
      useUI:() => ({ selectedStation:station, setSelectedStation:() => {} }),
      useStationDistances:() => ({ stationDistances:new Map(), routedStationIds:new Set() }),
    },
    '../utils/priceColors': {}, '../utils/stationFreshness': {}, '../hooks/useTransientFeedback': {},
    '../hooks/useBottomSheetBackHandler': { useBottomSheetBackHandler:() => ({ handleSheetChange:() => {}, handleSheetDismiss:() => {} }) },
    '../hooks/useAppearanceLayout': { useAppearanceLayout:() => ({ compact:densityId==='compact', space:density.DENSITIES[densityId] }) },
    '../hooks/useThemeTokens': { useThemeTokens:() => ({ colors:{} }) }, '../theme/layout': {},
    './WorthTheDrive': {}, './ui/SheetBackground': {}, './ui/SheetBackdrop': {}, './ui/GlassBox': { GlassBox:'GlassBox' },
  });
  const render = () => hooks.render(StationDetailSheet);
  let tree = render();
  assert.equal(tree.props.snapPoints[0], '44%');
  tree.props.onChange(1);
  for (const [id,snap,padding] of [['compact','44%',46], ['comfortable','50%',50]]) {
    densityId = id;
    tree = render();
    assert.equal(tree.props.snapPoints[0], snap);
    const footer = hooks.walk(tree).find(node => node.type==='View' && node.props.className==='px-lg pt-sm');
    assert.equal(footer.props.style.paddingBottom, padding);
  }
});
