import { Platform } from 'react-native';

import type { FuelStationFeature } from '../api/siphonClient';

const COUNTRY_NAMES: Record<string, string> = {
  ES: 'Spain',
  PT: 'Portugal',
};

function toTitleCase(str: string): string {
  if (str === str.toUpperCase() || str === str.toLowerCase()) {
    return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  return str;
}

function firstValue(properties: Record<string, any>, fields: readonly string[]): string | undefined {
  for (const field of fields) {
    const val = properties[field];
    if (val && typeof val === 'string' && val.trim()) return val.trim();
  }
  return undefined;
}

function firstValueClean(properties: Record<string, any>, fields: readonly string[]): string | undefined {
  const val = firstValue(properties, fields);
  return val ? toTitleCase(val) : undefined;
}

export function cleanAddress(properties: Record<string, any>): string {
  if (!properties.address) return '';
  return toTitleCase(properties.address.trim());
}

export function getLocationParts(properties: Record<string, any>): string[] {
  const parts: string[] = [];
  const seen = new Set<string>();

  const postalCode = properties.postalCode;
  const city = firstValueClean(properties, ['municipality', 'town', 'locality']);

  if (postalCode && city) {
    parts.push(`${postalCode} ${city}`);
    seen.add(city);
  } else if (city) {
    parts.push(city);
    seen.add(city);
  }

  for (const field of ['district', 'county', 'province', 'region', 'area'] as const) {
    const val = properties[field];
    if (val && typeof val === 'string' && val.trim()) {
      const cleaned = toTitleCase(val.trim());
      if (!seen.has(cleaned)) {
        parts.push(cleaned);
        seen.add(cleaned);
      }
    }
  }

  const country = COUNTRY_NAMES[properties.source];
  if (country) parts.push(country);

  return parts;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatStationAddress(properties: Record<string, any>): string {
  const parts: string[] = [];

  const bname = properties.brand || properties.name;
  if (bname) parts.push(toTitleCase(bname.trim()));

  const rawAddress = properties.address;
  if (rawAddress) {
    const cleaned = rawAddress.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    parts.push(toTitleCase(cleaned));
  }

  const postalCode = properties.postalCode;
  const city = firstValueClean(properties, ['municipality', 'town', 'locality']);

  if (postalCode && city) {
    parts.push(`${postalCode} ${city}`);
  } else if (city) {
    parts.push(city);
  }

  const province = firstValueClean(properties, ['province', 'region']);
  if (province && city && province.toLowerCase() !== city.toLowerCase()) {
    parts.push(province);
  } else if (province && !city) {
    parts.push(province);
  }

  const country = COUNTRY_NAMES[properties.source];
  if (country) parts.push(country);

  return parts.join(', ');
}

export function getMapsUrl(station: FuelStationFeature): string {
  const [lng, lat] = station.geometry.coordinates;
  const name = station.properties.brand || station.properties.name || 'Station';
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(name)}`;
  }
  return `https://maps.google.com/?q=${lat},${lng}`;
}
