import type { TFunction } from 'i18next';

function normalizeLabel(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Registry descriptions are Portuguese, regardless of the app's language.
const SERVICE_KEYS = new Map(Object.entries({
  'WC': 'toilets',
  'WC para deficientes': 'accessible_toilets',
  'WC com fraldário': 'baby_changing',
  'Cafetaria': 'cafe',
  'Restaurante': 'restaurant',
  'Loja de Conveniência': 'convenience_store',
  'Multibanco': 'atm',
  'Calibragem de pneus': 'tyre_inflation',
  'Lavagem': 'car_wash',
  'Assistência auto': 'vehicle_assistance',
  'Descanso de pesados': 'truck_rest_area',
  'Venda de gás doméstico em garrafas': 'bottled_gas',
  'Venda de carburante de qualidade superior': 'premium_fuel',
  'Venda de gasóleo agrícola': 'agricultural_diesel',
  'Venda de gasóleo para aquecimento': 'heating_diesel',
  'AUTOvoucher': 'autovoucher',
  'Via verde': 'via_verde',
}).map(([label, key]) => [normalizeLabel(label), key]));

const STATION_TYPE_KEYS = new Map(Object.entries({
  'Outro': 'other',
  'Auto-estrada': 'motorway',
  'Área comercial (Hipermercados)': 'hypermarket',
}).map(([label, key]) => [normalizeLabel(label), key]));

export function serviceLabel(value: string, t: TFunction): string {
  const key = SERVICE_KEYS.get(normalizeLabel(value));
  return key ? t(`station.service_labels.${key}`, { defaultValue: value }) : value;
}

export function stationTypeLabel(value: string, t: TFunction): string {
  const key = STATION_TYPE_KEYS.get(normalizeLabel(value));
  return key ? t(`station.type_labels.${key}`, { defaultValue: value }) : value;
}
