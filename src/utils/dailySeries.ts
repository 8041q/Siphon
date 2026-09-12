export const DAY_MS = 86_400_000;

export function isoDayToMs(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return Number.NaN;
  const [, y, m, d] = match;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

export function msToIsoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function shiftIsoDay(date: string, days: number): string {
  const ms = isoDayToMs(date);
  return Number.isFinite(ms) ? msToIsoDay(ms + days * DAY_MS) : date;
}

export function daysBetweenIso(a: string, b: string): number {
  const aMs = isoDayToMs(a);
  const bMs = isoDayToMs(b);
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return 0;
  return Math.round((bMs - aMs) / DAY_MS);
}

export function isoWeekday(date: string): number {
  const ms = isoDayToMs(date);
  return Number.isFinite(ms) ? new Date(ms).getUTCDay() : 0;
}

/**
 * SiphonAPI history is intentionally sparse: a date can be absent when the
 * published prices did not change. Expand those snapshots into a true daily
 * series by carrying the last known observation forward. This makes a 7/30/90
 * day window mean calendar days rather than a number of stored readings.
 */
export function forwardFillDaily<T extends { date: string }>(
  points: readonly T[],
  withDate: (point: T, date: string) => T,
): T[] {
  if (!points.length) return [];

  const byDate = new Map<string, T>();
  for (const point of points) {
    if (!Number.isFinite(isoDayToMs(point.date))) continue;
    // If a source somehow contains duplicate dates, the last observation wins.
    byDate.set(point.date, point);
  }
  if (!byDate.size) return [];

  const dates = [...byDate.keys()].sort((a, b) => isoDayToMs(a) - isoDayToMs(b));
  const firstMs = isoDayToMs(dates[0]);
  const lastMs = isoDayToMs(dates[dates.length - 1]);
  const result: T[] = [];
  let current: T | undefined;

  for (let ms = firstMs; ms <= lastMs; ms += DAY_MS) {
    const date = msToIsoDay(ms);
    const observed = byDate.get(date);
    if (observed) current = observed;
    if (current) result.push(withDate(current, date));
  }

  return result;
}
