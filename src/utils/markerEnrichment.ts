import type {
  FuelStationFeature,
  PortugalStationHours,
  StationMarkerStatus,
} from '../api/siphonClient';
import { parseSchedule } from './schedule';

export type StationStatus = StationMarkerStatus;

export const MARKER_DIESEL_KEY = 'diesel';
export const MARKER_GASOLINE95_KEY = 'gasoline95';

const MADRID_TZ = 'Europe/Madrid';
const LISBON_TZ = 'Europe/Lisbon';

const WEEKDAY_TO_ES_CODE: Record<string, string> = {
  MO: 'L',
  TU: 'M',
  WE: 'X',
  TH: 'J',
  FR: 'V',
  SA: 'S',
  SU: 'D',
};

const WEEKDAY_TO_PT_BUCKET: Record<string, keyof Pick<PortugalStationHours, 'weekdays' | 'saturday' | 'sunday'>> = {
  MO: 'weekdays',
  TU: 'weekdays',
  WE: 'weekdays',
  TH: 'weekdays',
  FR: 'weekdays',
  SA: 'saturday',
  SU: 'sunday',
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

function zonedClock(timeZone: string, now = new Date()): { weekday: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = getPart('weekday').slice(0, 2).toUpperCase();
  const hour = Number(getPart('hour'));
  const minute = Number(getPart('minute'));

  return {
    weekday,
    minutes: Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0,
  };
}

function spanishDayCode(now: Date): string {
  const { weekday } = zonedClock(MADRID_TZ, now);
  return WEEKDAY_TO_ES_CODE[weekday] ?? 'D';
}

/** Resolve open/closed/unknown for an ES `schedule` string in Madrid time. */
export function isStationOpen(schedule: string | undefined, now = new Date()): StationStatus {
  if (!schedule) return 'unknown';

  const segments = parseSchedule(schedule);
  if (segments.length === 0) return 'unknown';

  const { minutes } = zonedClock(MADRID_TZ, now);
  const dayCode = spanishDayCode(now);

  for (const segment of segments) {
    if (!segment.days.includes(dayCode)) continue;
    for (const window of segment.windows) {
      if (window.is24h) return 'open';
      const open = toMinutes(window.open);
      const close = toMinutes(window.close);
      if (open === null || close === null) continue;
      if (window.overnight) {
        if (minutes >= open || minutes < close) return 'open';
      } else if (minutes >= open && minutes < close) {
        return 'open';
      }
    }
  }

  return 'closed';
}

function statusFromPortugalHoursValue(value: string | null, minutes: number): StationStatus {
  if (!value?.trim()) return 'unknown';
  const normalized = value.trim().toLocaleLowerCase('pt-PT');

  if (normalized === 'aberto 24 horas') return 'open';
  if (normalized === 'fechado') return 'closed';

  const matches = [...value.matchAll(/(\d{1,2}:\d{2})\s*[-–-]\s*(\d{1,2}:\d{2})/g)];
  let sawValidWindow = false;

  for (const match of matches) {
    const open = toMinutes(match[1]);
    const close = toMinutes(match[2]);
    if (open === null || close === null) continue;
    sawValidWindow = true;

    if (close <= open) {
      if (minutes >= open || minutes < close) return 'open';
    } else if (minutes >= open && minutes < close) {
      return 'open';
    }
  }

  return sawValidWindow ? 'closed' : 'unknown';
}

/**
 * Resolve a PT `hours` object in Lisbon time.
 *
 * `holiday` cannot be selected safely without a Portuguese holiday calendar,
 * so normal weekday/Saturday/Sunday hours are used and ambiguous free text
 * returns `unknown` rather than guessing.
 */
export function isPortugalStationOpen(
  hours: PortugalStationHours | null | undefined,
  now = new Date(),
): StationStatus {
  if (!hours) return 'unknown';
  const { weekday, minutes } = zonedClock(LISBON_TZ, now);
  const bucket = WEEKDAY_TO_PT_BUCKET[weekday];
  if (!bucket) return 'unknown';
  return statusFromPortugalHoursValue(hours[bucket], minutes);
}

/**
 * Marker payload for a single station: open/closed status, brand icon key,
 * and the two most common fuel prices formatted for display on the map marker.
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
  const { properties } = station;
  const price95 = properties.fuels[MARKER_GASOLINE95_KEY];
  const priceDiesel = properties.fuels[MARKER_DIESEL_KEY];
  const status = properties.source === 'ES'
    ? isStationOpen(properties.schedule, now)
    : isPortugalStationOpen(properties.hours, now);

  return {
    status,
    icon: brandToIconKey(properties.brand),
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

/** Extend a station feature with precomputed marker properties. */
export function enrichStation(station: FuelStationFeature, now = new Date()): FuelStationFeature {
  const { status, icon, price95, priceDiesel } = computeMarkerData(station, now);
  const sortLat = station.geometry.coordinates[1];
  return {
    ...station,
    properties: {
      ...station.properties,
      _status: status,
      _icon: icon,
      _price95: price95,
      _priceDiesel: priceDiesel,
      _priceLabel: `95 ${price95 ?? '-'}\nD ${priceDiesel ?? '-'}`,
      _sortLat: sortLat,
    },
  };
}

export function enrichStations(stations: FuelStationFeature[], now = new Date()): FuelStationFeature[] {
  if (stations.length === 0) return stations;
  return stations.map((station) => enrichStation(station, now));
}
