import i18n from '../i18n';
import { PUBLISHED_FUEL_KEYS, type FuelKey } from '../api/siphonClient';

/**
 * Exact fuel-key set published by the live PT/ES station tiles.
 * Keep this sourced from the API schema so filters cannot silently drift.
 */
export const FUEL_KEYS: readonly FuelKey[] = PUBLISHED_FUEL_KEYS;

export function fuelLabel(key: string): string {
  const translated = i18n.t(`fuel.${key}`, { defaultValue: '' });
  return translated || key;
}

export const FUEL_UNITS: Partial<Record<FuelKey, (source: string) => string>> = {
  lpg: (source) => (source === 'PT' ? '€/kg' : '€/L'),
  cng: () => '€/kg',
  cngkg: () => '€/kg',
  cngm3: () => '€/m³',
  lng: () => '€/kg',
  bioCng: () => '€/kg',
  bioLng: () => '€/kg',
};

export function fuelUnit(key: string, source?: string): string {
  const unit = FUEL_UNITS[key as FuelKey];
  if (unit && source) return unit(source);
  return '€';
}
