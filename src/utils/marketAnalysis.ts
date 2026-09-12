import type { CommodityDataPoint, CommodityMetrics } from '../api/siphonClient';

export type MarketPressure = 'up' | 'down' | 'neutral';

export type MarketInsight = {
  crude7: number | null;
  crude30: number | null;
  retail7: number | null;
  retail30: number | null;
  crudeVolatility30: number | null;
  retailVolatility30: number | null;
  retailPercentile90: number | null;
  brentWtiSpreadPct: number | null;
  pressure: MarketPressure;
  passThrough: 'ahead' | 'catching_up' | 'caught_up' | 'unclear';
  expectedWindowDays: number | null;
  correlationStrength: 'strong' | 'moderate' | 'weak' | 'none';
};

const DAY = 86_400_000;

function clean(points: readonly CommodityDataPoint[]): CommodityDataPoint[] {
  return points.filter((p) => Number.isFinite(p.value)).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function pct(points: readonly CommodityDataPoint[], days: number): number | null {
  const p = clean(points);
  if (p.length < 2) return null;
  const latest = p[p.length - 1];
  const target = new Date(latest.date).getTime() - days * DAY;
  let prior: CommodityDataPoint | null = null;
  for (let i = p.length - 1; i >= 0; i -= 1) {
    if (new Date(p[i].date).getTime() <= target) {
      prior = p[i];
      break;
    }
  }
  if (!prior || prior.value === 0) return null;
  return ((latest.value - prior.value) / prior.value) * 100;
}

function dailyReturns(points: readonly CommodityDataPoint[], days = 30): number[] {
  const p = clean(points).slice(-(days + 1));
  const out: number[] = [];
  for (let i = 1; i < p.length; i += 1) {
    if (p[i - 1].value > 0) out.push(((p[i].value - p[i - 1].value) / p[i - 1].value) * 100);
  }
  return out;
}

function stdev(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length);
}

function percentile(points: readonly CommodityDataPoint[], days = 90): number | null {
  const p = clean(points);
  if (!p.length) return null;
  const latestMs = new Date(p[p.length - 1].date).getTime();
  const values = p.filter((x) => new Date(x.date).getTime() >= latestMs - (days - 1) * DAY).map((x) => x.value);
  if (values.length < 2) return null;
  const current = values[values.length - 1];
  return Math.max(0, Math.min(100, ((values.filter((v) => v <= current).length - 1) / (values.length - 1)) * 100));
}

export function analyzeMarket(
  crude: readonly CommodityDataPoint[],
  retail: readonly CommodityDataPoint[],
  metrics?: CommodityMetrics,
  wti: readonly CommodityDataPoint[] = [],
): MarketInsight {
  const crude7 = pct(crude, 7);
  const crude30 = pct(crude, 30);
  const retail7 = pct(retail, 7);
  const retail30 = pct(retail, 30);
  const cleanCrude = clean(crude);
  const cleanWti = clean(wti);
  const latestBrent = cleanCrude.length ? cleanCrude[cleanCrude.length - 1].value : undefined;
  const latestWti = cleanWti.length ? cleanWti[cleanWti.length - 1].value : undefined;
  const brentWtiSpreadPct = latestBrent && latestWti && latestWti > 0
    ? ((latestBrent - latestWti) / latestWti) * 100
    : null;
  const corr = metrics?.status === 'ok' ? Math.abs(metrics.correlation) : 0;
  const correlationStrength = corr >= 0.65 ? 'strong' : corr >= 0.4 ? 'moderate' : corr >= 0.2 ? 'weak' : 'none';

  const crudeSignal = (crude7 ?? 0) * 0.65 + (crude30 ?? 0) * 0.35;
  const retailSignal = (retail7 ?? 0) * 0.65 + (retail30 ?? 0) * 0.35;
  const weightedCrude = crudeSignal * Math.max(0.15, corr);
  const combined = weightedCrude * 0.58 + retailSignal * 0.42;
  const pressure: MarketPressure = Math.abs(combined) < 0.6 ? 'neutral' : combined > 0 ? 'up' : 'down';

  let passThrough: MarketInsight['passThrough'] = 'unclear';
  if (crude7 !== null && retail7 !== null && corr >= 0.2) {
    if (Math.sign(crude7) !== 0 && Math.sign(crude7) === Math.sign(retail7) && Math.abs(retail7) >= Math.abs(crude7) * 0.45) passThrough = 'caught_up';
    else if (Math.sign(crude7) !== 0 && Math.sign(crude7) === Math.sign(retail7)) passThrough = 'catching_up';
    else if (Math.abs(crude7) >= 1.2 && Math.abs(retail7) < 0.5) passThrough = 'ahead';
  }

  return {
    crude7,
    crude30,
    retail7,
    retail30,
    crudeVolatility30: stdev(dailyReturns(crude, 30)),
    retailVolatility30: stdev(dailyReturns(retail, 30)),
    retailPercentile90: percentile(retail, 90),
    brentWtiSpreadPct,
    pressure,
    passThrough,
    expectedWindowDays: metrics?.status === 'ok' ? Math.max(0, Math.round(metrics.lagDays)) : null,
    correlationStrength,
  };
}
