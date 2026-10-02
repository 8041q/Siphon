import { DAY_MS as DAY, forwardFillDaily, isoDayToMs, isoWeekday, shiftIsoDay } from './dailySeries';

export type PricePoint = { date: string; price: number };
export type Confidence = 'high' | 'medium' | 'low' | 'none';

export type PriceForecastResult = {
  horizonDays: number;
  asOfDate: string;
  targetDate: string;
  predicted: number;
  low: number;
  high: number;
  confidence: Confidence;
  backtestMae: number;
  backtestSamples: number;
  method: 'trend' | 'unchanged';
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
};

export const PRICE_FORECAST_MIN_DAYS = 80;

function clean(data: readonly PricePoint[]): PricePoint[] {
  const snapshots = data
    .filter((p) => typeof p.date === 'string' && Number.isFinite(isoDayToMs(p.date)) && Number.isFinite(p.price) && p.price > 0)
    .map((p) => ({ date: p.date, price: p.price }))
    .sort((a, b) => isoDayToMs(a.date) - isoDayToMs(b.date));
  return forwardFillDaily(snapshots, (point, date) => ({ ...point, date }));
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

export function historyCoverageDays(data: readonly PricePoint[]): number {
  return coverageDays(clean(data));
}

function coverageDays(points: readonly PricePoint[]): number {
  if (!points.length) return 0;
  return Math.floor((isoDayToMs(points[points.length - 1].date) - isoDayToMs(points[0].date)) / DAY) + 1;
}

function priceAtOrBefore(points: readonly PricePoint[], daysAgo: number): number | null {
  if (!points.length) return null;
  const target = shiftIsoDay(points[points.length - 1].date, -daysAgo);
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].date <= target) return points[i].price;
  }
  return null;
}

function pctChange(current: number, prior: number | null): number | null {
  if (!prior || !Number.isFinite(prior) || prior <= 0) return null;
  return ((current - prior) / prior) * 100;
}

function robustSlope(points: readonly PricePoint[], lookbackDays = 28): number {
  if (points.length < 3) return 0;
  const sample = points.slice(-(lookbackDays + 1));
  if (sample.length < 3) return 0;
  const xs = sample.map((_, i) => i);
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
  const recent = points.slice(-70);
  // Remove the local trend before comparing weekdays. Otherwise a rising or
  // falling month can look like a weekday effect simply because of sample dates.
  const slope = robustSlope(recent, recent.length - 1);
  const residuals = recent.map((p, i) => p.price - slope * i);
  const baseline = mean(residuals);
  const targetDay = isoWeekday(shiftIsoDay(points[points.length - 1].date, horizonDays));
  const values = recent.flatMap((p, i) => isoWeekday(p.date) === targetDay ? [residuals[i]] : []);
  if (values.length < 3) return 0;
  return mean(values) - baseline;
}

function simplePredict(points: readonly PricePoint[], horizonDays: number): number {
  const latest = points[points.length - 1].price;
  const slope = robustSlope(points);
  const recent = points.slice(-14);
  const recentMedian = median(recent.map((p) => p.price));
  const trendPrediction = latest + slope * horizonDays;
  // The median describes the middle of the window, not today. Project it to
  // the target date so smoothing does not erase a consistent recent trend.
  const medianProjection = Number.isFinite(recentMedian)
    ? recentMedian + slope * ((recent.length - 1) / 2 + horizonDays)
    : trendPrediction;
  const weekday = weekdayAdjustment(points, horizonDays);
  return Math.max(0, trendPrediction * 0.72 + medianProjection * 0.28 + weekday * 0.35);
}

function backtest(points: readonly PricePoint[], horizonDays: number) {
  // The 80-day display gate is separate from the 35-day training requirement.
  // Validate the most recent 18 completed forecasts, never their future targets.
  const trendErrors: number[] = [];
  const unchangedErrors: number[] = [];
  const lastOrigin = points.length - 1 - horizonDays;
  const firstOrigin = Math.max(34, lastOrigin - 17);
  for (let i = firstOrigin; i <= lastOrigin; i += 1) {
    const train = points.slice(0, i + 1);
    const actual = points[i + horizonDays].price;
    trendErrors.push(Math.abs(simplePredict(train, horizonDays) - actual));
    unchangedErrors.push(Math.abs(points[i].price - actual));
  }
  if (trendErrors.length < 5) return null;
  // A more complex trend must earn its place against the unchanged-price baseline.
  const method = mean(trendErrors) < mean(unchangedErrors) ? 'trend' : 'unchanged';
  const errors = method === 'trend' ? trendErrors : unchangedErrors;
  return { method, errors, mae: mean(errors) } as const;
}

export function forecastPrice(data: readonly PricePoint[], horizonDays: number): PriceForecastResult | null {
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 7) return null;
  const points = clean(data);
  const sampleDays = coverageDays(points);
  if (sampleDays < PRICE_FORECAST_MIN_DAYS) return null;
  const validation = backtest(points, horizonDays);
  if (!validation) return null;
  const latest = points[points.length - 1].price;
  const predicted = validation.method === 'trend' ? simplePredict(points, horizonDays) : latest;
  const last30 = points.slice(-30);
  const dailyMoves = last30.slice(1).map((p, i) => p.price - last30[i].price);
  // Keep the band sensitive to current volatility and recent misses. It is an
  // indicative range, not a claimed probability or statistical confidence interval.
  const sortedErrors = [...validation.errors].sort((a, b) => a - b);
  const recentMae = mean(validation.errors.slice(-5));
  const error = Math.max(validation.mae, recentMae);
  const halfWidth = Math.max(
    sortedErrors[Math.ceil(sortedErrors.length * 0.9) - 1],
    stdev(dailyMoves) * Math.sqrt(horizonDays),
    0.005,
  );
  const relativeError = error / latest;
  const confidence: Confidence = relativeError <= 0.012 ? 'high'
    : relativeError <= 0.025 ? 'medium'
    : relativeError <= 0.05 ? 'low' : 'none';
  if (confidence === 'none') return null;
  const delta = predicted - latest;
  // Do not describe a tiny move inside the model's typical error as a trend.
  const direction = Math.abs(delta) <= Math.max(0.005, error) ? 'flat' : delta > 0 ? 'up' : 'down';
  return {
    horizonDays, predicted,
    asOfDate: points[points.length - 1].date,
    targetDate: shiftIsoDay(points[points.length - 1].date, horizonDays),
    low: Math.max(0, predicted - halfWidth),
    high: predicted + halfWidth,
    confidence,
    backtestMae: validation.mae,
    backtestSamples: validation.errors.length,
    method: validation.method,
    sampleDays,
    direction,
  };
}

export function analyzePriceHistory(data: readonly PricePoint[]): PriceIntelligence | null {
  const points = clean(data);
  if (!points.length) return null;
  const current = points[points.length - 1].price;
  const last30 = points.slice(-30);
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
      daysSinceChange = points.length - 1 - (i + 1);
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
  };
}
