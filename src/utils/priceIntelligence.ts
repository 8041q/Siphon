export type PricePoint = { date: string; price: number };
export type Confidence = 'high' | 'medium' | 'low' | 'none';

export type PriceForecastResult = {
  horizonDays: number;
  predicted: number;
  low: number;
  high: number;
  confidence: Confidence;
  backtestMae: number | null;
  sampleDays: number;
  direction: 'up' | 'down' | 'flat';
};

export type PriceIntelligence = {
  current: number;
  min30: number;
  max30: number;
  avg30: number;
  median30: number;
  percentile30: number;
  change7: number | null;
  change30: number | null;
  daysSinceChange: number | null;
  volatility30: number;
  status: 'low' | 'normal' | 'high';
  forecast3: PriceForecastResult | null;
  forecast7: PriceForecastResult | null;
};

const DAY = 86_400_000;
export const PRICE_FORECAST_MIN_DAYS = 80;

function clean(data: readonly PricePoint[]): PricePoint[] {
  return data
    .filter((p) => typeof p.date === 'string' && Number.isFinite(p.price) && p.price > 0)
    .map((p) => ({ date: p.date, price: p.price }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
}

function stdev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length);
}

function coverageDays(points: readonly PricePoint[]): number {
  if (points.length < 2) return 0;
  return Math.floor((new Date(points[points.length - 1].date).getTime() - new Date(points[0].date).getTime()) / DAY) + 1;
}

function priceAtOrBefore(points: readonly PricePoint[], daysAgo: number): number | null {
  if (!points.length) return null;
  const latest = new Date(points[points.length - 1].date).getTime();
  const target = latest - daysAgo * DAY;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (new Date(points[i].date).getTime() <= target) return points[i].price;
  }
  return null;
}

function pctChange(current: number, prior: number | null): number | null {
  if (!prior || !Number.isFinite(prior) || prior <= 0) return null;
  return ((current - prior) / prior) * 100;
}

function robustSlope(points: readonly PricePoint[], lookbackDays = 28): number {
  if (points.length < 3) return 0;
  const latestMs = new Date(points[points.length - 1].date).getTime();
  const sample = points.filter((p) => new Date(p.date).getTime() >= latestMs - lookbackDays * DAY);
  if (sample.length < 3) return 0;
  const xs = sample.map((p) => (new Date(p.date).getTime() - new Date(sample[0].date).getTime()) / DAY);
  const ys = sample.map((p) => p.price);
  const xMean = mean(xs);
  const yMean = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i += 1) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  if (den === 0) return 0;
  const raw = num / den;
  const dailyMoves = sample.slice(1).map((p, i) => Math.abs(p.price - sample[i].price));
  const cap = Math.max(0.001, median(dailyMoves) * 2.5);
  return Math.max(-cap, Math.min(cap, raw));
}

function weekdayAdjustment(points: readonly PricePoint[], horizonDays: number): number {
  if (points.length < 28) return 0;
  const byDay = Array.from({ length: 7 }, () => [] as number[]);
  for (const point of points.slice(-70)) {
    const day = new Date(`${point.date}T12:00:00`).getDay();
    byDay[day].push(point.price);
  }
  const all = points.slice(-70).map((p) => p.price);
  const baseline = mean(all);
  if (!Number.isFinite(baseline)) return 0;
  const target = new Date(`${points[points.length - 1].date}T12:00:00`);
  target.setDate(target.getDate() + horizonDays);
  const values = byDay[target.getDay()];
  if (values.length < 3) return 0;
  return mean(values) - baseline;
}

function simplePredict(points: readonly PricePoint[], horizonDays: number): number {
  const latest = points[points.length - 1].price;
  const slope = robustSlope(points);
  const recentMedian = median(points.slice(-14).map((p) => p.price));
  const trendPrediction = latest + slope * horizonDays;
  const meanReversion = Number.isFinite(recentMedian) ? recentMedian : latest;
  const weekday = weekdayAdjustment(points, horizonDays);
  return Math.max(0, trendPrediction * 0.72 + meanReversion * 0.28 + weekday * 0.35);
}

function backtestMae(points: readonly PricePoint[], horizonDays: number): number | null {
  const minTrainDays = PRICE_FORECAST_MIN_DAYS;
  const maes: number[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const train = points.slice(0, i + 1);
    if (coverageDays(train) < minTrainDays || train.length < 35) continue;
    const targetDate = new Date(points[i].date).getTime() + horizonDays * DAY;
    const target = points.find((p, idx) => idx > i && new Date(p.date).getTime() >= targetDate);
    if (!target) continue;
    const predicted = simplePredict(train, horizonDays);
    maes.push(Math.abs(predicted - target.price));
    if (maes.length >= 18) break;
  }
  return maes.length >= 5 ? mean(maes) : null;
}

export function forecastPrice(data: readonly PricePoint[], horizonDays: number): PriceForecastResult | null {
  const points = clean(data);
  const sampleDays = coverageDays(points);
  if (sampleDays < PRICE_FORECAST_MIN_DAYS || points.length < 35) return null;
  const predicted = simplePredict(points, horizonDays);
  const mae = backtestMae(points, horizonDays);
  const dailyMoves = points.slice(-30).slice(1).map((p, i) => p.price - points.slice(-30)[i].price);
  const noise = Math.max(stdev(dailyMoves), 0.003);
  const error = Math.max(mae ?? noise * Math.sqrt(horizonDays), noise * 1.5);
  const latest = points[points.length - 1].price;
  const relativeError = latest > 0 ? error / latest : 1;
  const confidence: Confidence = mae === null
    ? 'low'
    : relativeError <= 0.012
      ? 'high'
      : relativeError <= 0.025
        ? 'medium'
        : relativeError <= 0.05
          ? 'low'
          : 'none';
  if (confidence === 'none') return null;
  const delta = predicted - latest;
  const direction = Math.abs(delta) < 0.005 ? 'flat' : delta > 0 ? 'up' : 'down';
  return {
    horizonDays,
    predicted,
    low: Math.max(0, predicted - error * 1.35),
    high: predicted + error * 1.35,
    confidence,
    backtestMae: mae,
    sampleDays,
    direction,
  };
}

export function analyzePriceHistory(data: readonly PricePoint[]): PriceIntelligence | null {
  const points = clean(data);
  if (!points.length) return null;
  const current = points[points.length - 1].price;
  const latestMs = new Date(points[points.length - 1].date).getTime();
  const last30 = points.filter((p) => new Date(p.date).getTime() >= latestMs - 29 * DAY);
  const prices30 = last30.map((p) => p.price);
  const min30 = Math.min(...prices30);
  const max30 = Math.max(...prices30);
  const avg30 = mean(prices30);
  const median30 = median(prices30);
  const percentile30 = prices30.length <= 1
    ? 50
    : (() => {
        // Mid-rank ties so a completely flat month is "typical" (50th
        // percentile) instead of being mislabeled as a high price.
        const epsilon = 0.0005;
        const less = prices30.filter((value) => value < current - epsilon).length;
        const equal = prices30.filter((value) => Math.abs(value - current) <= epsilon).length;
        return ((less + Math.max(0, equal - 1) / 2) / (prices30.length - 1)) * 100;
      })();
  const status = percentile30 <= 30 ? 'low' : percentile30 >= 70 ? 'high' : 'normal';
  let daysSinceChange: number | null = null;
  for (let i = points.length - 2; i >= 0; i -= 1) {
    if (Math.abs(points[i].price - current) > 0.0005) {
      daysSinceChange = Math.max(0, Math.round((latestMs - new Date(points[i + 1].date).getTime()) / DAY));
      break;
    }
  }
  const dailyMoves = last30.slice(1).map((p, i) => p.price - last30[i].price);
  return {
    current,
    min30,
    max30,
    avg30,
    median30,
    percentile30: Math.max(0, Math.min(100, percentile30)),
    change7: pctChange(current, priceAtOrBefore(points, 7)),
    change30: pctChange(current, priceAtOrBefore(points, 30)),
    daysSinceChange,
    volatility30: stdev(dailyMoves),
    status,
    forecast3: forecastPrice(points, 3),
    forecast7: forecastPrice(points, 7),
  };
}
