import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const flatten = (style) => Array.isArray(style)
  ? Object.assign({}, ...style.map(flatten))
  : style ?? {};

async function loadSource(relative, dependencies = {}) {
  const source = await readFile(new URL(relative, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
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

const { STYLE_SETS } = await loadSource('../src/theme/styles/sets.ts');

async function fixture(os, version = 31, scheme = 'light', styleSet = 'frosted') {
  const native = {
    Platform: { OS: os, Version: version },
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    StyleSheet: {
      absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      flatten,
    },
  };
  const colors = { surface: '#ffffff', label: scheme === 'dark' ? '#ffffff' : '#000000' };
  const theme = { useThemeTokens: () => ({ scheme, colors }) };
  const support = { useAppearanceSupport: () => ({ styleRules: STYLE_SETS[styleSet] }) };
  support.useSupport = support.useAppearanceSupport;
  const rules = await loadSource('../src/hooks/useStyleConfig.ts', { 'react-native': native });
  const glass = await loadSource('../src/components/ui/glass.tsx', {
    'react-native': native,
    'expo-blur': { BlurView: 'BlurView' },
    '../../hooks/useThemeTokens': theme,
  });
  const box = await loadSource('../src/components/ui/GlassBox.tsx', {
    'react-native': native,
    '../../hooks/useThemeTokens': theme,
    '../../hooks/useSupport': support,
    '../../hooks/useStyleConfig': rules,
    './glass': glass,
  });
  const input = await loadSource('../src/components/ui/input.tsx', {
    'react-native': native,
    '../../hooks/useThemeTokens': theme,
    '../../hooks/useSupport': support,
    '../../hooks/useStyleConfig': rules,
  });
  const field = await loadSource('../src/components/ui/field.tsx', {
    'react-native': native,
    '../../hooks/useThemeTokens': theme,
    '../../hooks/useSupport': support,
    '../../hooks/useStyleConfig': rules,
    './glass': glass,
  });
  return { ...rules, ...glass, ...box, ...input, ...field };
}

test('Android Frosted removes content clipping across all glass components and prior styles', async () => {
  const { applyComponentRules } = await fixture('android');
  for (const [component, rules] of Object.entries(STYLE_SETS['frosted'])) {
    if (!rules.glass) continue;
    for (const previous of ['default', 'quiet', 'quiet']) {
      const before = applyComponentRules(STYLE_SETS[previous][component]);
      const after = applyComponentRules(rules);
      assert.equal(after.overflow, 'visible', `${previous} → ${component}`);
      assert.equal(after.isolation, 'isolate', `${component} must contain its backdrop`);
      assert.equal(after.opacity, undefined, `${component} must keep foreground opaque`);
      assert.equal(after.borderRadius, rules.borderRadius);
      // A style switch replaces the prior rules rather than retaining its border.
      if (before.borderWidth) assert.equal(after.borderWidth, rules.borderWidth);
    }
  }
});

test('every style keeps a native stacking boundary before and after an appearance switch', async () => {
  const { applyComponentRules } = await fixture('android');
  for (const [style, components] of Object.entries(STYLE_SETS)) {
    for (const [component, rules] of Object.entries(components)) {
      // Fabric treats isolation as FormsStackingContext even for layout-only
      // views; without it, descendants are reparented when Glass is toggled.
      assert.equal(applyComponentRules(rules).isolation, 'isolate', `${style}/${component}`);
    }
  }
});

test('field keeps the same foreground slot and stacking parent throughout repeated style changes', async () => {
  for (const styleSet of ['default', 'quiet', 'frosted', 'quiet', 'frosted', 'default']) {
    const { Field } = await fixture('android', 31, 'dark', styleSet);
    const field = Field({ label: 'City', value: 'Porto', onChangeText: () => {} });
    const parent = field.props.children[1];
    assert.equal(flatten(parent.props.style).isolation, 'isolate', styleSet);
    assert.equal(parent.props.children[1].type, 'TextInput');
    assert.equal(parent.props.children[1].props.value, 'Porto');
    assert.equal(flatten(parent.props.children[1].props.style).color, '#ffffff');
  }
});

test('rounded Android glass keeps foreground outside the backdrop mask and preserves radius overrides', async () => {
  const { GlassBox, GlassSurface, GlassBackdrop } = await fixture('android');
  const text = require('react').createElement('Text', null, 'Visible label');
  for (const surface of [
    GlassSurface({ children: text, style: [{ borderRadius: 6, overflow: 'hidden' }] }),
  ]) {
    assert.equal(flatten(surface.props.style).overflow, 'visible');
    assert.equal(flatten(surface.props.style).isolation, 'isolate');
    const [background, foreground] = surface.props.children;
    assert.equal(foreground, text);
    const backdrop = GlassBackdrop(background.props);
    assert.equal(flatten(backdrop.props.style).borderRadius, 6);
    assert.equal(flatten(backdrop.props.style).overflow, 'hidden');
    assert.equal(flatten(backdrop.props.style).zIndex, -1);
    assert.equal(backdrop.props.pointerEvents, 'none');
  }
});

test('Android glass blurs only safe targets on Android 12+, keeping tint fallback elsewhere', async () => {
  const target = { current: {} };
  for (const version of [30, 31]) {
    const { GlassBackdrop } = await fixture('android', version);
    for (const blurTarget of [undefined, target]) {
      const background = GlassBackdrop({ blurTarget });
      const [blur, overlay] = background.props.children;
      const shouldBlur = version >= 31 && blurTarget !== undefined;
      assert.equal(Boolean(blur), shouldBlur);
      assert.equal(flatten(overlay.props.style).opacity, shouldBlur ? 0.35 : 1);
      if (shouldBlur) {
        assert.equal(blur.props.blurTarget, target);
        assert.equal(blur.props.blurMethod, 'dimezisBlurViewSdk31Plus');
      }
    }
  }
});

test('iOS glass retains blur and content clipping', async () => {
  const { applyComponentRules, GlassSurface, GlassBackdrop } = await fixture('ios');
  assert.equal(applyComponentRules(STYLE_SETS['frosted'].sheet).overflow, 'hidden');
  assert.equal(flatten(GlassSurface({ style: { borderRadius: 16 } }).props.style).overflow, 'hidden');
  assert.equal(GlassBackdrop({}).props.children[0].type, 'BlurView');
});

test('glass inputs set an explicit readable text color in both themes', async () => {
  for (const scheme of ['light', 'dark']) {
    const { Input } = await fixture('android', 31, scheme);
    const input = Input({ value: 'Porto', onChangeText: () => {} });
    const style = flatten(input.props.style);
    assert.equal(style.color, scheme === 'dark' ? '#ffffff' : '#000000');
    assert.equal(input.props.value, 'Porto');
    assert.equal(style.overflow, undefined, 'Frosted form inputs remain opaque content');
  }
});

test('sheet background preserves its blur host while live selections toggle glass', async () => {
  for(const os of ['android','ios']){
    const native={Platform:{OS:os},View:'View',StyleSheet:{absoluteFill:{position:'absolute'},flatten}};
    const rules=await loadSource('../src/hooks/useStyleConfig.ts',{'react-native':native});
    const target={current:{}};let active='quiet';
    const {SheetBackground}=await loadSource('../src/components/ui/SheetBackground.tsx',{
      'react-native':native,'../../hooks/useThemeTokens':{useThemeTokens:()=>({colors:{sheet:'#1D2227'}})},
      '../../hooks/useSupport':{useAppearanceSupport:()=>({styleRules:STYLE_SETS[active]})},
      '../../hooks/useStyleConfig':rules,'./glass':{GlassBackdrop:'Backdrop',useAppBlurTarget:()=>target},
    });
    for(const style of ['quiet','frosted','default','frosted','quiet']){
      active=style;const tree=SheetBackground({});
      assert.equal(tree.type,'View');assert.equal(flatten(tree.props.style).isolation,'isolate');
      assert.equal(tree.props.children.type,'Backdrop');assert.equal(tree.props.children.props.enabled,style==='frosted');
      assert.equal(tree.props.children.props.blurTarget,target);
    }
    const {GlassBackdrop}=await fixture(os,31,'dark');
    for(const enabled of [false,true,false]){
      const tree=GlassBackdrop({enabled,blurTarget:target});
      assert.equal(tree.props.children[0].type,'BlurView');assert.equal(tree.props.children[0].props.intensity,enabled?70:0);
      assert.equal(flatten(tree.props.style).opacity,enabled?1:0);
    }
  }
});


test('map glass forwards its map target and preserves the readable translucent tint on every platform', async () => {
  const target={current:{}};
  for(const [os,version] of [['ios',31],['android',31],['android',30]]){
    const {GlassSurface,GlassBackdrop}=await fixture(os,version,'dark');
    const surface=GlassSurface({opaque:false,blurTarget:target,tintOpacity:0.72,color:'#1D2227',children:'Control'});
    assert.equal(flatten(surface.props.style).backgroundColor,undefined);
    const backdrop=GlassBackdrop(surface.props.children[0].props);
    const [blur,tint]=backdrop.props.children;
    assert.equal(flatten(tint.props.style).opacity,0.72);
    assert.equal(flatten(tint.props.style).backgroundColor,'#1D2227');
    assert.equal(surface.props.children[1],'Control');
    if(os==='android'&&version>=31)assert.equal(blur.props.blurTarget,target);
    if(os==='android'&&version<31)assert.equal(blur,false);
  }
});

test('map glass accounts for the native tint instead of covering it with another heavy veil', async () => {
  const target={current:{}};
  for(const [os,version] of [['ios',31],['android',31],['android',30]]){
    const {mapGlassTintOpacity,mapGlassBorderColor}=await fixture(os,version);
    for(const scheme of ['light','dark']){
      const opacity=mapGlassTintOpacity(scheme,target);
      assert.equal(opacity,os==='android'&&version<31?0.72:scheme==='dark'?0.46:0.18);
      if(os==='android'&&version>=31){
        const nativeAlpha=0.7*(scheme==='dark'?0.55:0.78);
        const combined=1-(1-opacity)*(1-nativeAlpha);
        assert.ok(combined<0.7,'native tint plus the extra veil must remain visibly translucent');
      }
      assert.ok(mapGlassBorderColor(scheme).startsWith('rgba(255,255,255,'));
    }
  }
  const {mapGlassTintOpacity}=await fixture('android',31);
  assert.equal(mapGlassTintOpacity('dark'),0.72,'unavailable blur retains a readable fallback');
});
