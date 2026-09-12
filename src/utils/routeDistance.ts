import AsyncStorage from '@react-native-async-storage/async-storage';

const CROW_FLIES_TO_ROAD_RATIO = 1.38;
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_TABLE_URL = 'https://router.project-osrm.org/table/v1/driving';
const REQUEST_TIMEOUT_MS = 7000;
const CACHE_PREFIX = 'siphon:route:v2';
const LEGACY_CACHE_PREFIX = 'siphon:route:';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1200;

export type DistanceSource = 'estimate' | 'route';
export type DistanceResult = { value: number; source: DistanceSource };
export type RoadDistancePoint = {
  id: string;
  latitude: number;
  longitude: number;
};

type CachedDistanceResult = { value: number; cachedAt: number };

const pendingRequests = new Map<string, Promise<DistanceResult>>();
let cacheMaintenancePromise: Promise<void> | null = null;

function hasValidCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function cacheKey(fromId: string, toId: string, toLat: number, toLng: number): string {
  // Station coordinates are part of the key so a corrected/moved station does
  // not reuse a route computed for its previous coordinates.
  return `${CACHE_PREFIX}:${fromId}:${toId}:${toLat.toFixed(5)}:${toLng.toFixed(5)}`;
}

function isCachedDistance(value: unknown): value is CachedDistanceResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { value?: unknown; cachedAt?: unknown };
  return (
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value) &&
    candidate.value > 0 &&
    typeof candidate.cachedAt === 'number' &&
    Number.isFinite(candidate.cachedAt)
  );
}

async function maintainRouteCache(): Promise<void> {
  const now = Date.now();
  const keys = await AsyncStorage.getAllKeys();
  const routeKeys = keys.filter((key) => key.startsWith(LEGACY_CACHE_PREFIX));
  if (routeKeys.length === 0) return;

  const legacyKeys = routeKeys.filter((key) => !key.startsWith(`${CACHE_PREFIX}:`));
  const currentKeys = routeKeys.filter((key) => key.startsWith(`${CACHE_PREFIX}:`));
  const remove = new Set<string>(legacyKeys);
  const valid: Array<{ key: string; cachedAt: number }> = [];

  if (currentKeys.length > 0) {
    const entries = await AsyncStorage.multiGet(currentKeys);
    for (const [key, raw] of entries) {
      if (!raw) {
        remove.add(key);
        continue;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!isCachedDistance(parsed) || now - parsed.cachedAt > CACHE_TTL_MS || parsed.cachedAt > now + 60_000) {
          remove.add(key);
          continue;
        }
        valid.push({ key, cachedAt: parsed.cachedAt });
      } catch {
        remove.add(key);
      }
    }
  }

  if (valid.length > MAX_CACHE_ENTRIES) {
    valid.sort((a, b) => b.cachedAt - a.cachedAt);
    for (const entry of valid.slice(MAX_CACHE_ENTRIES)) remove.add(entry.key);
  }

  if (remove.size > 0) {
    await AsyncStorage.multiRemove([...remove]);
  }
}

function ensureRouteCacheMaintenance(): Promise<void> {
  if (!cacheMaintenancePromise) {
    cacheMaintenancePromise = maintainRouteCache().catch(() => undefined);
  }
  return cacheMaintenancePromise;
}

export function roadEstimateKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  if (!hasValidCoordinates(fromLat, fromLng) || !hasValidCoordinates(toLat, toLng)) {
    return Number.POSITIVE_INFINITY;
  }
  const R = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * CROW_FLIES_TO_ROAD_RATIO;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Siphon/1.0 (+https://github.com/8041q/SiphonAPI)',
      },
    });
  } finally {
    clearTimeout(id);
  }
}

async function readCachedRoute(
  fromId: string,
  point: RoadDistancePoint,
): Promise<DistanceResult | null> {
  const key = cacheKey(fromId, point.id, point.latitude, point.longitude);
  const cachedRaw = await AsyncStorage.getItem(key).catch(() => null);
  if (!cachedRaw) return null;

  try {
    const parsed = JSON.parse(cachedRaw) as unknown;
    if (isCachedDistance(parsed) && Date.now() - parsed.cachedAt <= CACHE_TTL_MS) {
      return { value: parsed.value, source: 'route' };
    }
  } catch {
    // Removed below.
  }

  void AsyncStorage.removeItem(key).catch(() => undefined);
  return null;
}

function persistRoute(fromId: string, point: RoadDistancePoint, value: number): void {
  const key = cacheKey(fromId, point.id, point.latitude, point.longitude);
  const cached: CachedDistanceResult = { value, cachedAt: Date.now() };
  void AsyncStorage.setItem(key, JSON.stringify(cached)).catch(() => undefined);
}

/**
 * Refine one station using OSRM's route service. A network failure returns the
 * instantaneous estimate and deliberately does not cache that estimate.
 */
export async function roadDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fromId: string,
  toId: string,
): Promise<DistanceResult> {
  if (!hasValidCoordinates(fromLat, fromLng) || !hasValidCoordinates(toLat, toLng)) {
    throw new Error('Invalid route coordinates');
  }

  await ensureRouteCacheMaintenance();

  const point: RoadDistancePoint = { id: toId, latitude: toLat, longitude: toLng };
  const cached = await readCachedRoute(fromId, point);
  if (cached) return cached;

  const key = cacheKey(fromId, toId, toLat, toLng);
  const existing = pendingRequests.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<DistanceResult> => {
    try {
      const url = `${OSRM_ROUTE_URL}/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
      const res = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
      if (res.ok) {
        const json = (await res.json()) as { routes?: Array<{ distance?: number }> };
        const distance = json.routes?.[0]?.distance;
        if (typeof distance === 'number' && Number.isFinite(distance) && distance > 0) {
          const value = distance / 1000;
          persistRoute(fromId, point, value);
          return { value, source: 'route' };
        }
      }
    } catch {
      // Network error/timeout: keep the estimate, but do not persist it. A
      // temporary OSRM outage must not suppress a later real route lookup.
    }

    return { value: roadEstimateKm(fromLat, fromLng, toLat, toLng), source: 'estimate' };
  })();

  pendingRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    pendingRequests.delete(key);
  }
}

/**
 * Refine several stations with one OSRM Table request (one user source, many
 * station destinations). Cached stations are returned without network traffic.
 * Failed/unroutable cells keep their local estimate and are not cached.
 *
 * Keep batches modest (the caller currently uses 20 destinations) because the
 * public router.project-osrm.org endpoint is a demo service, not a bulk API.
 */
export async function roadDistancesKm(
  fromLat: number,
  fromLng: number,
  points: readonly RoadDistancePoint[],
  fromId: string,
): Promise<Map<string, DistanceResult>> {
  if (!hasValidCoordinates(fromLat, fromLng)) {
    throw new Error('Invalid route coordinates');
  }

  await ensureRouteCacheMaintenance();

  const results = new Map<string, DistanceResult>();
  const validPoints = points.filter(
    (point) => hasValidCoordinates(point.latitude, point.longitude),
  );

  if (validPoints.length === 0) return results;

  const cachedEntries = await Promise.all(
    validPoints.map(async (point) => ({ point, cached: await readCachedRoute(fromId, point) })),
  );

  const unresolved: RoadDistancePoint[] = [];
  for (const { point, cached } of cachedEntries) {
    if (cached) results.set(point.id, cached);
    else unresolved.push(point);
  }

  if (unresolved.length === 0) return results;

  try {
    const coordinates = [
      `${fromLng},${fromLat}`,
      ...unresolved.map((point) => `${point.longitude},${point.latitude}`),
    ].join(';');
    const destinations = unresolved.map((_, index) => index + 1).join(';');
    const url = `${OSRM_TABLE_URL}/${coordinates}?sources=0&destinations=${destinations}&annotations=distance&skip_waypoints=true`;
    const res = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);

    if (res.ok) {
      const json = (await res.json()) as {
        code?: string;
        distances?: Array<Array<number | null>>;
      };
      const row = json.code === 'Ok' ? json.distances?.[0] : undefined;
      if (row) {
        unresolved.forEach((point, index) => {
          const meters = row[index];
          if (typeof meters === 'number' && Number.isFinite(meters) && meters > 0) {
            const value = meters / 1000;
            results.set(point.id, { value, source: 'route' });
            persistRoute(fromId, point, value);
          }
        });
      }
    }
  } catch {
    // Keep local estimates below. Do not fan out into one route request per
    // station when the table service is unavailable.
  }

  for (const point of unresolved) {
    if (!results.has(point.id)) {
      results.set(point.id, {
        value: roadEstimateKm(fromLat, fromLng, point.latitude, point.longitude),
        source: 'estimate',
      });
    }
  }

  return results;
}
