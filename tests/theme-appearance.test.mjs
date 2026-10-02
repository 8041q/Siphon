import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const project = path.resolve(import.meta.dirname, '..');
function loadSource(relative, dependencies = {}) {
  const file = path.resolve(project, relative);
  const module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}
const tokens = loadSource('src/theme/tokens.ts');
const { PALETTES } = loadSource('src/theme/palettes.ts', { './tokens': tokens });

function rgba(value) {
  if (value.startsWith('#')) return [...value.slice(1).matchAll(/../g)].map(v => Number.parseInt(v[0], 16)).concat(1);
  return value.match(/[\d.]+/g).map(Number);
}
function luminance(rgb) {
  return rgb.slice(0, 3).map(value => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(foreground, background) {
  const bg = rgba(background), fg = rgba(foreground);
  const composited = fg.slice(0, 3).map((value, i) => value * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
  const a = luminance(composited), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('all palettes keep small text readable on supported surfaces, including alpha colors', () => {
  for (const [palette, themes] of Object.entries(PALETTES)) for (const [scheme, colors] of Object.entries(themes)) {
    for (const foreground of ['label', 'secondaryLabel', 'tertiaryLabel', 'placeholder', 'tint', 'priceLow', 'priceMid', 'priceHigh']) {
      for (const background of ['background', 'surface', 'groupedBackground', 'sheet', 'fieldBackground']) {
        const ratio = contrast(colors[foreground], colors[background]);
        assert.ok(ratio >= 4.5, `${palette}/${scheme} ${foreground} on ${background}: ${ratio.toFixed(2)}`);
      }
    }
    for (const [foreground, background] of [['labelOnTint', 'tint'], ['dayBannerText', 'dayBannerBg']]) {
      assert.ok(contrast(colors[foreground], colors[background]) >= 4.5, `${palette}/${scheme} ${foreground}`);
    }
  }
});

// Keep this list tied to real callers: a newly introduced literal icon must be
// supported by every set rather than silently turning into a question mark.
function usedIconNames() {
  const names = new Set(['map.fill', 'map', 'list.bullet', 'list', 'magnifyingglass', 'search', 'star.fill', 'star', 'star_border', 'gearshape.fill', 'settings', 'my_location', 'filter_list', 'directions', 'copy', 'info.circle', 'flag', 'github', 'kofi', 'lock', 'gift', 'oilcan.fill']);
  function scan(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { scan(file); continue; }
      if (!entry.name.endsWith('.tsx')) continue;
      const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node) {
        if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(ast) === 'Icon') {
          for (const attribute of node.attributes.properties) if (ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'name' && attribute.initializer && ts.isStringLiteral(attribute.initializer)) names.add(attribute.initializer.text);
        }
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
  }
  scan(path.join(project, 'app')); scan(path.join(project, 'src/components'));
  return names;
}

const iconNames = usedIconNames();
for (const [set, library, font] of [['ionicons', 'ionicons', 'Ionicons'], ['material', 'material-icons', 'MaterialIcons'], ['fontawesome', 'fontawesome', 'FontAwesome']]) {
  test(`${set} resolves every application icon to a real bundled glyph and distinguishes favorites`, () => {
    const { render } = loadSource(`src/theme/icons/sets/${set}.tsx`, { [`@react-native-vector-icons/${library}/static`]: { default: 'FontIcon' } });
    const glyphs = JSON.parse(readFileSync(path.join(project, `node_modules/@react-native-vector-icons/${library}/glyphmaps/${font}.json`), 'utf8'));
    for (const name of iconNames) {
      const icon = render({ name, size: 19, color: '#123456' });
      assert.ok(glyphs[icon.props.name], `${set}: ${name} → ${icon.props.name}`);
      assert.ok(!['help-circle-outline', 'help-outline', 'question-circle'].includes(icon.props.name), `${set}: missing ${name}`);
      assert.equal(icon.props.size, 19); assert.equal(icon.props.color, '#123456');
    }
    assert.notEqual(render({ name: 'star' }).props.name, render({ name: 'star.fill' }).props.name);
    assert.ok(!render({ name: 'star.fill' }).props.name.includes('half'));
  });
}

test('badge values, ghost buttons, and icons default to the active palette instead of platform colors', () => {
  for (const colors of [PALETTES.default.light, PALETTES.mono.dark]) {
    const theme = { useThemeTokens: () => ({ colors }) };
    const captured = [];
    const support = { useSupport: () => ({ styleRules: { badge: {}, button: {} } }), useAppearanceSupport: () => ({ iconSet: { render: props => { captured.push(props); return null; } } }) };
    const deps = {
      'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator' },
      '../../hooks/useThemeTokens': theme, '../../hooks/useSupport': support,
      '../../hooks/useStyleConfig': { useStyleConfig: (rules, name) => rules[name], applyComponentRules: () => ({}), componentSurface: (rules, colors, fallback) => colors[fallback], isGlass: () => false },
      './glass': {},
    };
    const { Badge } = loadSource('src/components/ui/badge.tsx', deps);
    assert.equal(Badge({ label: 'Distance', value: '2.4 km' }).props.children[2].props.style.color, colors.label);
    const { Button } = loadSource('src/components/ui/button.tsx', deps);
    assert.equal(Button({ children: 'Reset', variant: 'ghost', onPress: () => {} }).props.children.props.style.color, colors.tint);
    assert.equal(Button({ children: 'Find', onPress: () => {} }).props.children.props.style.color, colors.labelOnTint);
    assert.equal(Button({ children: 'Reset', variant: 'ghost', loading: true, onPress: () => {} }).props.children.props.color, colors.tint);
    const { Icon } = loadSource('src/components/ui/icon.tsx', deps);
    Icon({ name: 'map.fill' }); assert.equal(captured[0].color, colors.label);
    Icon({ name: 'map.fill', color: '#fedcba' }); assert.equal(captured[1].color, '#fedcba');
  }
});

const flatten = style => Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style ?? {};
const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];

test('all styles retain the benchmark price guide on featured and secondary prices', () => {
  const { appearancePalette } = loadSource('src/theme/appearance.ts');
  const guide = loadSource('src/utils/priceColors.ts');
  const now = new Date().toISOString().slice(0,10);
  const benchmarks = { schemaVersion:1, method:'anchored_real_net_price_quartiles', asOf:now, bands:{gasoline95_pt:{fuel:'gasoline95',country:'PT',unit:'EUR/L',greenBelow:1.7,redAbove:1.85}} };
  for(const palette of Object.values(PALETTES)) for(const style of ['default','quiet','frosted']) for(const scheme of ['light','dark']) for(const compact of [true,false]){
    const colors=appearancePalette(palette,style)[scheme];
    const { PriceBadge } = loadSource('src/components/PriceBadge.tsx', {
      react:{memo:c=>c},'react-native':{Text:'Text',View:'View'},'react-i18next':{useTranslation:()=>({t:key=>key})},
      '../utils/fuelNames':{fuelLabel:()=> 'Gasoline 95',fuelUnit:()=> '€/L'},
      '../hooks/useThemeTokens':{useThemeTokens:()=>({colors,scheme})},
      '../hooks/useAppearanceSupport':{}, '../hooks/useSupport':{useAppearanceSupport:()=>({styleRules:{chip:{}}})},
      '../hooks/useAppearanceLayout':{useAppearanceLayout:()=>({modern:style!=='default',compact,numericStyle:{}})},
      '../hooks/useStyleConfig':{useStyleConfig:()=>({}),applyComponentRules:()=>({}),isGlass:()=>false},
      './ui/glass':{},'../hooks/useApp':{usePriceBenchmarks:()=>benchmarks},'../utils/priceColors':guide,
    });
    for(const [price,source,level] of [[1.6,'PT','low'],[1.8,'PT','mid'],[1.9,'PT','high'],[1.6,'ES','unknown']]) for(const prominent of [true,false]){
      const tree=PriceBadge.type({fuel:'gasoline95',price,source,prominent});
      const value=walk(tree).find(n=>n.type==='Text'&&Array.isArray(n.props.children)&&n.props.children[0]===price.toFixed(3));
      const color=flatten(value.props.style).color;
      assert.equal(color,guide.priceLevelColor(level,colors,scheme),`${style}/${scheme}/${level}/${prominent}`);
      assert.ok(contrast(color,colors.surface)>=4.5);
    }
  }
});

test('map actions retain glass only for Glass and stay readable over light and dark map tiles', () => {
  const { appearancePalette } = loadSource('src/theme/appearance.ts');
  const { STYLE_SETS }=loadSource('src/theme/styles/sets.ts');
  const rules=loadSource('src/hooks/useStyleConfig.ts',{'react-native':{Platform:{OS:'android'}}});
  const blurTarget={current:{}};
  const glassApi=loadSource('src/components/ui/glass.tsx',{'react-native':{Platform:{OS:'android',Version:31}},'expo-blur':{},'../../hooks/useThemeTokens':{}});
  for(const palette of Object.values(PALETTES)) for(const style of ['default','quiet','frosted']) for(const scheme of ['light','dark']){
    const colors=appearancePalette(palette,style)[scheme];
    const { MapActionButton }=loadSource('src/components/MapActionButton.tsx',{
      'react-native':{ActivityIndicator:'Spinner',Text:'Text',TouchableOpacity:'TouchableOpacity',View:'View'},
      '../hooks/useThemeTokens':{useThemeTokens:()=>({colors,scheme})},'./ui/glass':{...glassApi,GlassSurface:'Surface'},'./ui/icon':{Icon:'Icon'},
      '../hooks/useSupport':{useAppearanceSupport:()=>({styleRules:STYLE_SETS[style]})},'../hooks/useStyleConfig':rules,
    });
    for(const iconName of ['my_location','filter_list']){
      const tree=MapActionButton({iconName,label:iconName,onPress:()=>{},badgeCount:1,blurTarget});
      assert.equal(tree.props.opaque,style!=='frosted');assert.equal(tree.props.color,colors.surface);
      assert.equal(tree.props.blurTarget,blurTarget);
      const foreground=walk(tree).find(n=>n.type==='Icon').props.color;
      assert.equal(foreground,style==='frosted'?colors.label:colors.tint);
      for(const tile of ['#FFFFFF','#000000']){
        const opacity=tree.props.opaque?1:tree.props.tintOpacity;
        // Expo Android adds its material tint before our extra veil (intensity 70).
        const nativeAlpha=scheme==='dark'?0.55*0.7:0.78*0.7;
        const nativeColor=scheme==='dark'?37:249;
        const base=rgba(tile).slice(0,3).map(v=>tree.props.opaque?v:nativeColor*nativeAlpha+v*(1-nativeAlpha));
        const rgb=rgba(colors.surface).slice(0,3).map((v,i)=>Math.round(v*opacity+base[i]*(1-opacity)));
        const background='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
        assert.ok(contrast(foreground,background)>=4.5,`${style}/${scheme} on ${tile}`);
      }
    }
  }
  const home=ts.createSourceFile('index.tsx',readFileSync(path.join(project,'app/(tabs)/index.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let glassPills=0,mapTargets=0;
  const inspect=n=>{
    if(ts.isJsxOpeningElement(n)&&n.tagName.getText(home)==='GlassSurface'){
      const attributes=n.attributes.properties;
      if(attributes.find(a=>a.name?.getText(home)==='opaque')?.initializer?.expression?.getText(home)==='!glass'){
        glassPills++;
        assert.equal(attributes.find(a=>a.name?.getText(home)==='blurTarget')?.initializer?.expression?.getText(home),'mapBlurTarget');
      }
    }
    if(ts.isJsxOpeningElement(n)&&n.tagName.getText(home)==='BlurTargetView')mapTargets++;
    ts.forEachChild(n,inspect);
  };
  inspect(home);assert.equal(glassPills,2);assert.equal(mapTargets,1);
});

test('Privacy & Legal header and page follow the active light/dark palette', () => {
  for(const scheme of ['light','dark']) for(const palette of Object.values(PALETTES)){
    const colors=palette[scheme];
    const {default:LegalScreen}=loadSource('app/legal.tsx',{
      'react-native':{Linking:{},ScrollView:'Scroll',Text:'Text',View:'View'},'expo-router':{Stack:{Screen:'Screen'}},
      'react-i18next':{useTranslation:()=>({t:key=>key})},'react-native-safe-area-context':{SafeAreaView:'SafeArea',useSafeAreaInsets:()=>({bottom:0})},
      '../src/hooks/useThemeTokens':{useThemeTokens:()=>({colors})},'../src/hooks/useSupport':{useAppearanceSupport:()=>({styleRules:{}})},
      '../src/hooks/useStyleConfig':{useStyleConfig:()=>({}),applyComponentRules:()=>({})},'../src/components/ui/list-item':{},'../src/config/legal':{},
    });
    const tree=LegalScreen(),options=walk(tree).find(n=>n.type==='Screen').props.options;
    assert.equal(options.headerStyle.backgroundColor,colors.background);
    assert.equal(options.headerTintColor,colors.label);assert.equal(options.headerTitleStyle.color,colors.label);
    assert.equal(options.contentStyle.backgroundColor,tree.props.style.backgroundColor);
  }
});
