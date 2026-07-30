import i18n from '../i18n';

export const FUEL_KEYS = [
  'gasoline95', 'gasoline95Plus', 'gasoline95Premium',
  'gasoline98', 'gasoline98Plus',
  'diesel', 'dieselPremium', 'dieselAgri', 'dieselB', 'dieselRenewable', 'dieselHeating',
  'bioDiesel', 'bioCng', 'bioLng',
  'cng', 'cngkg', 'cngm3', 'lng', 'lpg',
  'gasolineMix', 'adblue',
];

export function fuelLabel(key: string): string {
  const translated = i18n.t(`fuel.${key}`, { defaultValue: '' });
  return translated || key;
}

export const FUEL_UNITS: Record<string, (source: string) => string> = {
  lpg: (source) => (source === 'PT' ? '€/kg' : '€/L'),
  cng: () => '€/kg',
  cngkg: () => '€/kg',
  cngm3: () => '€/m³',
  lng: () => '€/kg',
  bioCng: () => '€/kg',
  bioLng: () => '€/kg',
};

export function fuelUnit(key: string, source?: string): string {
  if (key in FUEL_UNITS && source) {
    return FUEL_UNITS[key](source);
  }
  return '€';
}
