import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './helpers/loadSource.mjs';
import { hookHarness } from './helpers/hooks.mjs';

const daily = await loadSource('src/utils/dailySeries.ts');
const model = await loadSource('src/utils/priceIntelligence.ts', { './dailySeries': daily });
const series = (length, price) => Array.from({length}, (_,i)=>({date:daily.shiftIsoDay('2026-07-01',i),price:price(i)}));

test('80-day forecasts are historically validated within the 90-day storage window', () => {
  for (const horizon of [3,7]) {
    assert.equal(model.forecastPrice(series(79,()=>1.7),horizon),null);
    const result = model.forecastPrice(series(80,()=>1.7),horizon);
    assert.ok(result);
    assert.ok(result.backtestSamples >= 5);
    assert.equal(result.backtestMae,0);
    assert.equal(result.predicted,1.7);
    assert.equal(result.direction,'flat');
    assert.equal(result.asOfDate,'2026-09-18');
    assert.equal(result.targetDate,daily.shiftIsoDay('2026-09-18',horizon));
    assert.ok(result.low < result.predicted && result.high > result.predicted);
  }
});

test('unchanged-price baseline avoids inventing movement for a stable station', () => {
  const result = model.forecastPrice(series(90,()=>1.72),7);
  assert.equal(result.method,'unchanged');
  assert.equal(result.predicted,1.72);
  assert.equal(result.direction,'flat');
});

test('forecast tracks predictable movement and keeps the indicative range around the estimate', () => {
  const result = model.forecastPrice(series(90,i=>1.9-i*.002),7);
  assert.equal(result.method,'trend');
  assert.equal(result.direction,'down');
  assert.ok(result.predicted<1.722);
  assert.ok(result.low<=result.predicted && result.high>=result.predicted);
  assert.ok(Math.abs(result.predicted-(1.9-96*.002))<.015);
});

test('recent instability suppresses forecasts even after a long accurate period', () => {
  const data = series(180,i=>i<145?1.7:(i%2?2.4:1.0));
  assert.equal(model.forecastPrice(data,3),null);
  assert.equal(model.forecastPrice(data,7),null);
});

test('old volatility does not outweigh recent stable validation', () => {
  const data = series(180,i=>i<80?(i%2?2.4:1.0):1.7);
  const result = model.forecastPrice(data,7);
  assert.equal(result.backtestMae,0);
  assert.equal(result.confidence,'high');
  assert.equal(result.predicted,1.7);
});

test('sparse unchanged-price snapshots use calendar coverage, and invalid horizons are rejected', () => {
  const points = series(80,()=>1.7);
  const sparse = [points[0],points.at(-1)];
  assert.equal(model.historyCoverageDays(sparse),80);
  assert.equal(model.forecastPrice(sparse,7).predicted,1.7);
  assert.equal(model.historyCoverageDays([]),0);
  for(const horizon of [0,-1,1.5,8,NaN]) assert.equal(model.forecastPrice(points,horizon),null);
});

async function forecastHarness(data, forecasts=model.forecastPrice) {
  const hooks=hookHarness();
  const {PriceForecast}=await loadSource('src/components/PriceForecast.tsx',{
    react:hooks.react,'react-native':{Text:'Text',View:'View',TouchableOpacity:'Button'},
    'react-i18next':{useTranslation:()=>({t:(key,values)=>key+(values?' '+JSON.stringify(values):'')})},
    '../hooks/useAppearanceLayout': { useAppearanceLayout: () => ({ space: { xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32 }, numericStyle: {}, modern:false, compact:false }) },
    '../hooks/useThemeTokens':{useThemeTokens:()=>({colors:{}})},
    '../utils/priceIntelligence':{...model,forecastPrice:forecasts},'./ui/GlassBox':{GlassBox:'GlassBox'}, './ui/icon':{Icon:'Icon'},
  });
  const render=()=>hooks.render(()=>PriceForecast({data,unit:'€',marketInsight:{pressure:'down'}}));
  return {hooks,render};
}

test('forecast hides technical details by default and expands them on request', async () => {
  const {hooks,render}=await forecastHarness(series(80,()=>1.7));
  let nodes=hooks.walk(render());
  assert.ok(nodes.some(n=>n.props.children==='€/L'));
  assert.ok(!nodes.some(n=>String(n.props.children).startsWith('price_trends.forecast_horizon_value')));
  const button=nodes.find(n=>n.type==='Button');
  assert.equal(button.props.accessibilityState.expanded,false);
  button.props.onPress();nodes=hooks.walk(render());
  assert.equal(nodes.find(n=>n.type==='Button').props.accessibilityState.expanded,true);
  assert.equal(nodes.filter(n=>String(n.props.children).startsWith('price_trends.forecast_horizon_value')).length,2);
  assert.ok(nodes.some(n=>n.props.children==='market.pressure_down'));
});

test('forecast explains locked, unreliable and partially available horizons without empty prices', async () => {
  const locked=await forecastHarness(series(79,()=>1.7));
  assert.ok(locked.hooks.walk(locked.render()).some(n=>String(n.props.children).startsWith('price_trends.forecast_locked')));
  const none=await forecastHarness(series(80,()=>1.7),()=>null);
  assert.ok(none.hooks.walk(none.render()).some(n=>n.props.children==='price_trends.forecast_unreliable'));
  const partial=await forecastHarness(series(80,()=>1.7),(data,h)=>h===7?null:model.forecastPrice(data,h));
  assert.ok(partial.hooks.walk(partial.render()).some(n=>n.props.children==='price_trends.forecast_horizon_unavailable'));
});
