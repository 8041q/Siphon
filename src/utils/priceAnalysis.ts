import type { PriceHistoryPoint } from '../api/siphonClient';

const DAY_MS = 86400000;

export const FORECAST_MIN_DAYS = 80;
export const WEEKDAY_MIN_POINTS = 14;
export const CHEAP_LOOKBACK_DAYS = 30;
export const CHEAP_DROP_PCT = 0.03;
export const TREND_WINDOW = 30;
export const FORECAST_HORIZONS = [3, 7] as const;

const DAY_KEYS = ['day_d', 'day_l', 'day_m', 'day_x', 'day_j', 'day_v', 'day_s'] as const;

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_I18N_KEYS = DAY_KEYS;

export function weekdayI18nKey(day: number): string {
  return DAY_KEYS[day] ?? 'day_l';
}

function parseDay(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY_MS);
}

// Calendar span between the first and last data point, inclusive, capped at the
// 80-day rolling window the client keeps on device.
export function historyCoverageDays(points: PriceHistoryPoint[]): number {
  if (points.length < 1) return 0;
  const span = daysBetween(points[0].date, points[points.length - 1].date) + 1;
  return Math.max(1, Math.min(80, span));
}

export interface PriceStats {
  current: number;
  min: number;
  max: number;
  avg: number;
  change7dPct: number | null;
  change30dPct: number | null;
  low30: number;
}

function priceNDaysAgo(points: PriceHistoryPoint[], n: number): number | null {
  const target = parseDay(points[points.length - 1].date);
  target.setDate(target.getDate() - n);
  const targetStr = formatDay(target);
  const ref = points.find((p) => p.date >= targetStr);
  return ref ? ref.price : points[0].price;
}

export function statsFor(points: PriceHistoryPoint[]): PriceStats | null {
  if (points.length < 2) return null;
  const prices = points.map((p) => p.price);
  const current = prices[prices.length - 1];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  const window = points.slice(-CHEAP_LOOKBACK_DAYS);
  const low30 = Math.min(...window.map((p) => p.price));

  const pct = (ref: number | null) => (ref ? ((current - ref) / ref) * 100 : null);
  return { current, min, max, avg, change7dPct: pct(priceNDaysAgo(points, 7)), change30dPct: pct(priceNDaysAgo(points, 30)), low30 };
}

export interface WeekdayCycle {
  averages: (number | null)[];
  bestDay: number;
}

export function weekdayCycle(points: PriceHistoryPoint[]): WeekdayCycle | null {
  if (points.length < WEEKDAY_MIN_POINTS) return null;

  const sums = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);
  for (const p of points) {
    const day = parseDay(p.date).getDay();
    sums[day] += p.price;
    counts[day]++;
  }

  const averages: (number | null)[] = sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : null));
  const present = WEEKDAY_ORDER.filter((d) => averages[d] !== null);
  if (present.length < 2) return null;

  let bestDay = present[0];
  for (const d of present) {
    if ((averages[d] as number) < (averages[bestDay] as number)) bestDay = d;
  }

  return { averages, bestDay };
}

export type Confidence = 'high' | 'medium' | 'low';

export interface ForecastResult {
  predicted: PriceHistoryPoint[];
  horizon: number;
  low: number;
  high: number;
  confidence: Confidence;
}

// Simple linear-regression model. Never run on thin data — callers gate on
// FORECAST_MIN_DAYS via historyCoverageDays.
function linearRegression(pts: number[]): { slope: number; intercept: number; residualStd: number } {
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: pts[0] ?? 0, residualStd: 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += pts[i];
    sumXY += i * pts[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const residuals = pts.map((y, i) => y - (intercept + slope * i));
  const mean = residuals.reduce((a, b) => a + b, 0) / n;
  const variance = residuals.reduce((acc, r) => acc + (r - mean) ** 2, 0) / n;
  return { slope, intercept, residualStd: Math.sqrt(variance) };
}

export function forecast(points: PriceHistoryPoint[], horizon: number): ForecastResult | null {
  if (points.length < 2 || historyCoverageDays(points) < FORECAST_MIN_DAYS) return null;

  const window = points.slice(-TREND_WINDOW);
  const prices = window.map((p) => p.price);
  const { slope, residualStd } = linearRegression(prices);

  const minHist = Math.min(...prices);
  const maxHist = Math.max(...prices);
  const range = maxHist - minHist || 1;
  const clamp = (v: number) => Math.max(0, Math.min(Math.max(v, minHist - 0.2 * range), maxHist + 0.2 * range));

  const allMean = points.reduce((a, p) => a + p.price, 0) / points.length;
  const sums = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);
  for (const p of points) {
    const day = parseDay(p.date).getDay();
    sums[day] += p.price;
    counts[day]++;
  }
  const season = sums.map((s, i) => (counts[i] > 0 ? s / counts[i] - allMean : 0));

  const last = points[points.length - 1];
  const lastDate = parseDay(last.date);
  const lastDay = lastDate.getDay();

  const predicted: PriceHistoryPoint[] = [];
  for (let d = 1; d <= horizon; d++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + d);
    const targetDay = date.getDay();
    const value = clamp(last.price + slope * d + season[targetDay] - season[lastDay]);
    predicted.push({ date: formatDay(date), price: value });
  }

  const confRange = range;
  const normalizedStd = confRange > 0 ? residualStd / confRange : 0;
  const confidence: Confidence = normalizedStd < 0.05 ? 'high' : normalizedStd < 0.12 ? 'medium' : 'low';

  const band = residualStd * 1.96;
  const predPrices = predicted.map((p) => p.price);
  const low = Math.max(0, Math.min(...predPrices) - band);
  const high = Math.max(...predPrices) + band;

  return { predicted, horizon, low, high, confidence };
}

export interface CheapDay {
  cheap: boolean;
  reason: 'low30' | 'drop' | null;
  dropPct: number | null;
}

export function isCheapDay(points: PriceHistoryPoint[]): CheapDay {
  if (points.length < 2) return { cheap: false, reason: null, dropPct: null };

  const current = points[points.length - 1].price;
  const window = points.slice(-CHEAP_LOOKBACK_DAYS);
  const low30 = Math.min(...window.map((p) => p.price));
  if (current <= low30) return { cheap: true, reason: 'low30', dropPct: null };

  const ref = priceNDaysAgo(points, 7);
  if (ref) {
    const dropPct = ((ref - current) / ref) * 100;
    if (dropPct >= CHEAP_DROP_PCT * 100) return { cheap: true, reason: 'drop', dropPct };
  }

  return { cheap: false, reason: null, dropPct: null };
}
