import type { FuelStationFeature } from '../api/siphonClient';

export function normalizeSearchText(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function stationSearchText(station: FuelStationFeature): { text: string; location: string } {
  const p = station.properties;
  const location = normalizeSearchText(`${p.municipality} ${p.source === 'PT' ? p.district : p.province} ${p.address}`);
  return { text: `${normalizeSearchText(`${p.brand ?? ''} ${p.name ?? ''}`)} ${location}`, location };
}

export function matchesSearch(text: string, query: string): boolean {
  return query.split(' ').every(token => text.includes(token));
}
