import type { PriceBenchmarks } from '../api/siphonClient';

export type PriceLevel = 'low' | 'mid' | 'high' | 'unknown';

/** Constant-time lookup against the API's anchored reference, never today's rank. */
export function priceLevel(price: number, fuel: string, source: string | undefined, benchmarks: PriceBenchmarks | null, now = Date.now()): PriceLevel {
  if (!Number.isFinite(price) || price <= 0 || !source || benchmarks?.schemaVersion !== 1 || benchmarks.method !== 'anchored_real_net_price_quartiles') return 'unknown';
  const updated = Date.parse(`${benchmarks.asOf}T00:00:00Z`);
  const age = now - updated;
  // Keep last good references during brief outages, but do not imply certainty forever.
  if (!Number.isFinite(age) || new Date(updated).toISOString().slice(0, 10) !== benchmarks.asOf || age < -86400000 || age > 120 * 86400000) return 'unknown';
  const band = benchmarks.bands?.[`${fuel}_${source.toLowerCase()}`];
  const unit = fuel === 'lpg' && source === 'PT' ? 'EUR/kg' :
    ['cng', 'cngkg', 'lng', 'bioCng', 'bioLng'].includes(fuel) ? 'EUR/kg' : fuel === 'cngm3' ? 'EUR/m3' : 'EUR/L';
  if (!band || band.fuel !== fuel || band.country !== source || band.unit !== unit ||
      !Number.isFinite(band.greenBelow) || !Number.isFinite(band.redAbove) ||
      band.greenBelow <= 0 || band.redAbove <= band.greenBelow) return 'unknown';
  if (price < band.greenBelow) return 'low';
  if (price > band.redAbove) return 'high';
  return 'mid';
}

export function priceLevelColor(level: PriceLevel, colors: { priceLow: string; priceMid: string; priceHigh: string; label: string; secondaryLabel?: string }, scheme: 'light' | 'dark' = 'dark'): string {
  return level === 'low' ? colors.priceLow : level === 'mid' ? colors.priceMid : level === 'high' ? colors.priceHigh :
    scheme === 'light' ? colors.secondaryLabel ?? colors.label : colors.label;
}
