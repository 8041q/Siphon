import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './helpers/loadSource.mjs';
import { hookHarness } from './helpers/hooks.mjs';

async function renderChart(dataA, dataB) {
  const hooks = hookHarness();
  const { CommodityChart } = await loadSource('src/components/CommodityChart.tsx', {
    react: hooks.react, 'react-native': { Text:'Text', View:'View' },
    'react-native-svg': { Line:'Line', Path:'Path', Svg:'Svg', Text:'SvgText' },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '../hooks/useAppearanceLayout': { useAppearanceLayout: () => ({ space: { xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32 }, numericStyle: {}, modern:false, compact:false }) },
    '../hooks/useThemeTokens': { useThemeTokens: () => ({ colors: {} }) },
  });
  const render = () => hooks.render(() => CommodityChart({ dataA, dataB, labelA:'Crude', labelB:'Retail' }));
  let tree = render();
  const layout = hooks.walk(tree).find(node => node.props?.onLayout);
  if (layout) { layout.props.onLayout({ nativeEvent: { layout: { width:360 } } }); tree = render(); }
  return hooks.walk(tree);
}
const point = (date,value) => ({ date,value });
const xs = node => [...node.props.d.matchAll(/[ML] ([\d.]+),/g)].map(match => Number(match[1]));

test('Market aligns shared dates, respects uneven gaps and retains latest retail observations', async () => {
  const nodes = await renderChart(
    [point('2025-01-01',80),point('2026-08-02',90),point('2026-08-10',100)],
    [point('2026-08-02',1.5),point('2026-08-04',1.6),point('2026-08-10',1.7),point('2026-08-12',1.8)],
  );
  const [crude,retail] = nodes.filter(node => node.type === 'Path').map(xs);
  assert.equal(nodes.filter(node => node.type === 'Path')[1].props.strokeDasharray,'6 3', 'retail remains distinguishable when palette hues are similar');
  assert.equal(crude.length,2, 'old crude outside the shared window is excluded');
  assert.equal(crude[0],retail[0]); assert.equal(crude[1],retail[2], 'same dates share the same x coordinate');
  assert.ok(Math.abs((retail[1]-retail[0])/(retail[3]-retail[0])-.2)<.00001, 'two-day gap takes 20% of ten days');
  assert.equal(retail[3],348); assert.ok(crude[1]<retail[3]);
  assert.ok(nodes.some(node => node.type==='SvgText' && node.props.children==='08-12'));
});

test('Market keeps non-overlapping series separated in time and handles a single valid series', async () => {
  const nodes = await renderChart([point('2026-01-01',80),point('2026-01-10',85)], [point('2026-02-01',1.5),point('2026-02-10',1.6)]);
  const [crude,retail] = nodes.filter(node => node.type==='Path').map(xs);
  assert.ok(crude[1]<retail[0]);
  const single = await renderChart([point('invalid',NaN),point('2026-01-01',80),point('2026-01-10',85)], [point('2026-01-10',1.5)]);
  assert.equal(single.filter(node => node.type==='Path').length,1);
  assert.deepEqual(xs(single.find(node => node.type==='Path')),[36,348]);
});
