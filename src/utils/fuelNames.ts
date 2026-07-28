export const FUEL_LABELS: Record<string, string> = {
  gasoline95: 'Gasolina 95',
  gasoline95Plus: 'Gasolina 95+',
  gasoline98: 'Gasolina 98',
  gasoline98Plus: 'Gasolina 98+',
  diesel: 'Gasóleo',
  dieselPremium: 'Gasóleo Premium',
  dieselAgri: 'Gasóleo Agrícola',
  lpg: 'GPL',
  adblue: 'AdBlue',
};

export function fuelLabel(key: string): string {
  return FUEL_LABELS[key] ?? key;
}
