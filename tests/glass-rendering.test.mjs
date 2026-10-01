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

async function fixture(os, version = 31, scheme = 'light') {
  const native = {
    Platform: { OS: os, Version: version },
    View: 'View',
    TextInput: 'TextInput',
    StyleSheet: {
      absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      flatten,
    },
  };
  const colors = { surface: '#ffffff', label: scheme === 'dark' ? '#ffffff' : '#000000' };
  const theme = { useThemeTokens: () => ({ scheme, colors }) };
  const support = { useAppearanceSupport: () => ({ styleRules: STYLE_SETS['liquid-glass'] }) };
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
  return { ...rules, ...glass, ...box, ...input };
}

test('Android Liquid Glass removes content clipping across all glass components and prior styles', async () => {
  const { applyComponentRules } = await fixture('android');
  for (const [component, rules] of Object.entries(STYLE_SETS['liquid-glass'])) {
    if (!rules.glass) continue;
    for (const previous of ['default', 'dotted', 'retro']) {
      const before = applyComponentRules(STYLE_SETS[previous][component]);
      const after = applyComponentRules(rules);
      assert.equal(after.overflow, 'visible', `${previous} → ${component}`);
      assert.equal(after.isolation, 'isolate', `${component} must contain its backdrop`);
      assert.equal(after.opacity, undefined, `${component} must keep foreground opaque`);
      assert.equal(after.borderRadius, rules.borderRadius);
      // A style switch replaces the prior rules rather than retaining its border.
      if (before.borderWidth) assert.equal(after.borderWidth, undefined);
    }
  }
});

test('rounded Android glass keeps foreground outside the backdrop mask and preserves radius overrides', async () => {
  const { GlassBox, GlassSurface, GlassBackdrop } = await fixture('android');
  const text = require('react').createElement('Text', null, 'Visible label');
  for (const surface of [
    GlassBox({ component: 'card', children: text, className: 'overflow-hidden', style: [{ borderRadius: 6 }] }),
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
      assert.equal(flatten(overlay.props.style).opacity, shouldBlur ? 0.35 : 0.78);
      if (shouldBlur) {
        assert.equal(blur.props.blurTarget, target);
        assert.equal(blur.props.blurMethod, 'dimezisBlurViewSdk31Plus');
      }
    }
  }
});

test('iOS glass retains blur and content clipping', async () => {
  const { applyComponentRules, GlassSurface, GlassBackdrop } = await fixture('ios');
  assert.equal(applyComponentRules(STYLE_SETS['liquid-glass'].card).overflow, 'hidden');
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
    assert.equal(style.overflow, 'visible');
  }
});
