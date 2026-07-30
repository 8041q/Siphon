import i18n from '../i18n';

export function fuelLabel(key: string): string {
  const translated = i18n.t(`fuel.${key}`, { defaultValue: '' });
  return translated || key;
}

export const FUEL_UNITS: Record<string, (source: string) => string> = {
  lpg: (source) => (source === 'PT' ? '€/kg' : '€/L'),
};

export function fuelUnit(key: string, source?: string): string {
  if (key in FUEL_UNITS && source) {
    return FUEL_UNITS[key](source);
  }
  return '€';
}
