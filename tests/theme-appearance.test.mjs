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

test('custom SVG icons have meaningful geometry, preserve color/size, and distinguish favorites', () => {
  const { render } = loadSource('src/theme/icons/sets/custom-svg.tsx', {
    'react-native-svg': { default: 'Svg', Circle: 'Circle', G: 'G', Path: 'Path', Rect: 'Rect' },
  });
  const fallback = render({ name: 'unknown' }).props.children.props.children;
  for (const name of iconNames) {
    const icon = render({ name, size: 19, color: '#123456' });
    assert.equal(icon.props.width, 19); assert.equal(icon.props.height, 19);
    assert.equal(icon.props.stroke, '#123456'); assert.equal(icon.props.viewBox, '0 0 24 24');
    if (name !== 'info.circle') assert.notEqual(icon.props.children.props.children, fallback, `missing SVG: ${name}`);
  }
  assert.notEqual(render({ name: 'star' }).props.children.props.children, render({ name: 'star.fill' }).props.children.props.children);
  assert.notEqual(render({ name: 'map.fill' }).props.children.props.children, render({ name: 'magnifyingglass' }).props.children.props.children);
});

test('badge values, ghost buttons, and icons default to the active palette instead of platform colors', () => {
  for (const colors of [PALETTES.default.light, PALETTES.mono.dark]) {
    const theme = { useThemeTokens: () => ({ colors }) };
    const captured = [];
    const support = { useSupport: () => ({ styleRules: { badge: {}, button: {} } }), useAppearanceSupport: () => ({ iconSet: { render: props => { captured.push(props); return null; } } }) };
    const deps = {
      'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator' },
      '../../hooks/useThemeTokens': theme, '../../hooks/useSupport': support,
      '../../hooks/useStyleConfig': { useStyleConfig: (rules, name) => rules[name], applyComponentRules: () => ({}), isGlass: () => false },
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
