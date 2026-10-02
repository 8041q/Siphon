import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource, deferred } from './helpers/loadSource.mjs';
import { hookHarness } from './helpers/hooks.mjs';
const tick = () => new Promise(resolve => setImmediate(resolve));

test('an open history screen reloads after background data arrives and ignores obsolete reads', async () => {
  const hooks = hookHarness();
  const versions = { historyDataVersion: 0 };
  const first = deferred();
  const fresh = [{ date: '2026-10-02', price: 1.5 }];
  let reads = 0;
  const { usePriceHistory } = await loadSource('src/hooks/usePriceHistory.ts', {
    react: hooks.react, './useApp': { useUI: () => ({ historyEnabled: true }), useSecondaryDataUpdates: () => versions,
      client: { getPriceHistory: async () => ++reads === 1 ? first.promise : fresh } },
  });
  const render = () => hooks.render(() => usePriceHistory('es-1', 'diesel'));
  render(); hooks.flushEffects();
  versions.historyDataVersion++; render(); hooks.flushEffects(); await tick();
  assert.equal(render().data, fresh);
  first.resolve([]); await tick();
  assert.equal(render().data, fresh);
  hooks.unmount();
});

test('an open market screen reads completed background data without another network refresh', async () => {
  const hooks = hookHarness();
  const versions = { commodityDataVersion: 0 };
  let cached = null, reads = 0, requests = 0;
  const { useCommodities } = await loadSource('src/hooks/useCommodities.ts', {
    react: hooks.react, './useApp': { useSecondaryDataUpdates: () => versions,
      client: { getCachedCommodityDashboard: async () => { reads++; return cached; }, refreshCommodityDashboard: async () => { requests++; return cached; } } },
  });
  const render = () => hooks.render(() => useCommodities({ refresh: false }));
  render(); hooks.flushEffects(); await tick();
  assert.equal(render().dashboard, null);
  cached = { lastUpdated: '2026-10-02' }; versions.commodityDataVersion++;
  render(); hooks.flushEffects(); await tick();
  assert.equal(render().dashboard, cached);
  assert.equal(reads, 2);
  assert.equal(requests, 0);
  hooks.unmount();
});
