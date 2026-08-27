import type { FuelStationFeature } from '../api/siphonClient';
import { parseSchedule } from './schedule';

export type StationStatus = 'open' | 'closed' | 'unknown';

export const MARKER_DIESEL_KEY = 'diesel';
export const MARKER_GASOLINE95_KEY = 'gasoline95';

const MADRID_TZ = 'Europe/Madrid';

const WEEKDAY_TO_CODE: Record<string, string> = {
  MO: 'L',
  TU: 'M',
  WE: 'X',
  TH: 'J',
  FR: 'V',
  SA: 'S',
  SU: 'D',
};

/** Minutes since midnight for a given HH:MM string, or null if malformed. */
function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isFinite(h) && Number.isFinite(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
    return h * 60 + m;
  }
  return null;
}

/** Current weekday code (L/M/X/J/V/S/D) and minutes-since-midnight in Madrid time. */
function nowInMadrid(now = new Date()): { dayCode: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MADRID_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  const weekday = getPart('weekday').slice(0, 2).toUpperCase();
  const dayCode = WEEKDAY_TO_CODE[weekday] ?? dayCodeFromGetDay(now);

  const hour = Number(getPart('hour'));
  const minute = Number(getPart('minute'));
  const minutes = Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;

  return { dayCode, minutes };
}

function dayCodeFromGetDay(date: Date): string {
  const idx = date.getDay(); // 0=Sun..6=Sat
  const order = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return order[idx] ?? 'D';
}

/**
 * Resolve open/closed/unknown for a station's schedule string using the
 * current date/time in the Iberian timezone.
 */
export function isStationOpen(schedule: string | undefined, now = new Date()): StationStatus {
  if (!schedule) return 'unknown';

  const segments = parseSchedule(schedule);
  if (segments.length === 0) return 'unknown';

  const { dayCode, minutes } = nowInMadrid(now);

  for (const seg of segments) {
    if (!seg.days.includes(dayCode)) continue;
    for (const window of seg.windows) {
      if (window.is24h) return 'open';
      const open = toMinutes(window.open);
      const close = toMinutes(window.close);
      if (open === null || close === null) continue;
      if (window.overnight) {
        // Window crosses midnight: open from `open` until `close` the next day.
        if (minutes >= open || minutes < close) return 'open';
      } else {
        if (minutes >= open && minutes < close) return 'open';
      }
    }
  }
  return 'closed';
}

/**
 * Marker payload for a single station: open/closed status, brand icon key,
 * and the two most common fuel prices (gasoline 95 and diesel) formatted for
 * display on the map marker.
 */
export function computeMarkerData(
  station: FuelStationFeature,
  now = new Date(),
): {
  status: StationStatus;
  icon: string;
  price95: string | null;
  priceDiesel: string | null;
} {
  const props = station.properties as {
    brands?: string;
    brand?: string;
    fuels?: Record<string, number>;
    schedule?: string;
  };

  const fuels = props.fuels ?? {};
  const price95 = fuels[MARKER_GASOLINE95_KEY];
  const priceDiesel = fuels[MARKER_DIESEL_KEY];

  return {
    status: isStationOpen(props.schedule, now),
    icon: brandToIconKey(props.brands ?? props.brand),
    price95: typeof price95 === 'number' ? price95.toFixed(3) : null,
    priceDiesel: typeof priceDiesel === 'number' ? priceDiesel.toFixed(3) : null,
  };
}

function brandToIconKey(brand: string | undefined | null): string {
  if (!brand) return 'default';
  const key = brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
  return key || 'default';
}

/**
 * Extend a station feature with precomputed marker properties. Returns a new
 * feature so the cached source data stays untouched.
 */
export function enrichStation(station: FuelStationFeature, now = new Date()): FuelStationFeature {
  const { status, icon, price95, priceDiesel } = computeMarkerData(station, now);
  const sortLat = station.geometry.coordinates[1];
  return {
    type: 'Feature',
    geometry: station.geometry,
    properties: {
      ...station.properties,
      _status: status,
      _icon: icon,
      _price95: price95,
      _priceDiesel: priceDiesel,
      _sortLat: sortLat,
    },
  };
}

export function enrichStations(stations: FuelStationFeature[], now = new Date()): FuelStationFeature[] {
  if (stations.length === 0) return stations;
  return stations.map((s) => enrichStation(s, now));
}
