import AsyncStorage from '@react-native-async-storage/async-storage';

import { hybridStore } from '../store/hybridStore';
import { routingProvider, type RoutingDestination } from '../routing';

const CROW_FLIES_TO_ROAD_RATIO = 1.38;
const CACHE_PREFIX = 'siphon:route:v3';
const LEGACY_CACHE_PREFIX = 'siphon:route:v2';
const CACHE_SCHEMA_VERSION = 1;

export type DistanceSource = 'estimate' | 'route';
export type DistanceResult = { value: number; source: DistanceSource };
export type RoadDistancePoint = RoutingDestination;

type StoredRouteDistance = {
  schemaVersion: number;
  provider: string;
  value: number;
  savedAt: number;
};

type LegacyCachedDistance = {
  value: number;
  cachedAt?: number;
};

const pendingRequests = new Map<string, Promise<DistanceResult>>();

function hasValidCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function safeSegment(value: string): string {
  return encodeURIComponent(value).replace(/\*/g, '%2A');
}

/**
 * Durable route key. Origin is intentionally the caller's ~100 m location
 * bucket rather than exact GPS coordinates so tiny GPS jitter reuses the same
 * route. Destination coordinates invalidate a route automatically if a station
 * is moved/corrected in a future data update.
 */
function cacheKey(fromId: string, point: RoadDistancePoint): string {
  const coordinateKey = `${point.latitude.toFixed(5)}_${point.longitude.toFixed(5)}`;
  return `${CACHE_PREFIX}/${safeSegment(routingProvider.cacheNamespace)}/${safeSegment(fromId)}/${safeSegment(point.id)}_${coordinateKey}.json`;
}

function legacyCacheKey(fromId: string, point: RoadDistancePoint): string {
  return `${LEGACY_CACHE_PREFIX}:${fromId}:${point.id}:${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}`;
}

function isStoredRoute(value: unknown): value is StoredRouteDistance {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StoredRouteDistance>;
  return (
    candidate.schemaVersion === CACHE_SCHEMA_VERSION &&
    candidate.provider === routingProvider.cacheNamespace &&
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value) &&
    candidate.value > 0 &&
    typeof candidate.savedAt === 'number' &&
    Number.isFinite(candidate.savedAt)
  );
}

function isLegacyRoute(value: unknown): value is LegacyCachedDistance {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<LegacyCachedDistance>;
  return typeof candidate.value === 'number' && Number.isFinite(candidate.value) && candidate.value > 0;
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

async function persistRoute(fromId: string, point: RoadDistancePoint, value: number): Promise<void> {
  if (!Number.isFinite(value) || value <= 0) return;
  const stored: StoredRouteDistance = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    provider: routingProvider.cacheNamespace,
    value,
    savedAt: Date.now(),
  };
  // hybridStore writes route entries atomically into the app document directory.
  await hybridStore.setItem(cacheKey(fromId, point), JSON.stringify(stored));
}

async function readCachedRoute(fromId: string, point: RoadDistancePoint): Promise<DistanceResult | null> {
  const key = cacheKey(fromId, point);
  const raw = await hybridStore.getItem(key).catch(() => null);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isStoredRoute(parsed)) return { value: parsed.value, source: 'route' };
    } catch {
      // Removed below.
    }
    if (hybridStore.removeItem) {
      await hybridStore.removeItem(key).catch(() => undefined);
    }
  }

  // Pass-8 stored successful OSRM routes in AsyncStorage under v2 keys. Migrate
  // each one lazily the first time it is needed so existing users keep the work
  // already performed instead of re-querying OSRM after updating the app.
  if (routingProvider.id === 'osrm') {
    const oldKey = legacyCacheKey(fromId, point);
    const legacyRaw = await AsyncStorage.getItem(oldKey).catch(() => null);
    if (legacyRaw) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(legacyRaw) as unknown;
      } catch {
        await AsyncStorage.removeItem(oldKey).catch(() => undefined);
        return null;
      }

      if (isLegacyRoute(parsed)) {
        try {
          await persistRoute(fromId, point, parsed.value);
          await AsyncStorage.removeItem(oldKey).catch(() => undefined);
        } catch {
          // Keep the legacy copy if the durable migration write fails. The
          // route is still valid for this session and can be migrated later.
        }
        return { value: parsed.value, source: 'route' };
      }

      await AsyncStorage.removeItem(oldKey).catch(() => undefined);
    }
  }

  return null;
}

/**
 * Refine one station through the active routing provider. Successful routed
 * distances are persisted without a TTL. Network/provider failures return the
 * instantaneous estimate and are never cached as if they were real routes.
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

  const point: RoadDistancePoint = { id: toId, latitude: toLat, longitude: toLng };
  const cached = await readCachedRoute(fromId, point);
  if (cached) return cached;

  const key = cacheKey(fromId, point);
  const existing = pendingRequests.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<DistanceResult> => {
    const value = await routingProvider.routeDistanceKm(
      { latitude: fromLat, longitude: fromLng },
      point,
    );

    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      await persistRoute(fromId, point, value).catch(() => undefined);
      return { value, source: 'route' };
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

async function routeIndividuallyWithBoundedConcurrency(
  fromLat: number,
  fromLng: number,
  points: readonly RoadDistancePoint[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const concurrency = 4;
  let cursor = 0;

  const worker = async () => {
    while (cursor < points.length) {
      const index = cursor++;
      const point = points[index];
      const value = await routingProvider.routeDistanceKm(
        { latitude: fromLat, longitude: fromLng },
        point,
      );
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        result.set(point.id, value);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, points.length) }, () => worker()));
  return result;
}

/**
 * Refine several stations from one origin. Cached entries are loaded from the
 * durable file store first; only missing routes reach the provider. OSRM uses a
 * single Table request for the unresolved destinations in each caller batch.
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

  const results = new Map<string, DistanceResult>();
  const validPoints = points.filter((point) => hasValidCoordinates(point.latitude, point.longitude));
  if (validPoints.length === 0) return results;

  const cachedEntries = await Promise.all(
    validPoints.map(async (point) => ({ point, cached: await readCachedRoute(fromId, point) })),
  );

  const unresolved: RoadDistancePoint[] = [];
  for (const { point, cached } of cachedEntries) {
    if (cached) results.set(point.id, cached);
    else unresolved.push(point);
  }

  if (unresolved.length > 0) {
    const routed = routingProvider.tableDistancesKm
      ? await routingProvider.tableDistancesKm(
          { latitude: fromLat, longitude: fromLng },
          unresolved,
        )
      : await routeIndividuallyWithBoundedConcurrency(fromLat, fromLng, unresolved);

    const writes: Promise<void>[] = [];
    for (const point of unresolved) {
      const value = routed.get(point.id);
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue;
      results.set(point.id, { value, source: 'route' });
      writes.push(persistRoute(fromId, point, value));
    }
    // Wait for all atomic file writes before returning. A storage failure is
    // non-fatal for the current session, but successful writes survive restarts.
    if (writes.length > 0) await Promise.allSettled(writes);
  }

  for (const point of validPoints) {
    if (!results.has(point.id)) {
      results.set(point.id, {
        value: roadEstimateKm(fromLat, fromLng, point.latitude, point.longitude),
        source: 'estimate',
      });
    }
  }

  return results;
}

/** Deletes all permanently cached routed distances. Estimates are unaffected. */
export async function clearRouteDistanceCache(): Promise<number> {
  const keys = await hybridStore.listKeys?.('siphon:route:') ?? [];
  if (hybridStore.removeItem) {
    await Promise.allSettled(keys.map((key) => hybridStore.removeItem!(key)));
  }

  // Also remove the phase-8 AsyncStorage cache. Otherwise a cleared legacy
  // route could be lazily migrated back into the permanent cache later.
  const legacyKeys = (await AsyncStorage.getAllKeys().catch(() => []))
    .filter((key) => key.startsWith(`${LEGACY_CACHE_PREFIX}:`));
  if (legacyKeys.length > 0) {
    await AsyncStorage.multiRemove(legacyKeys).catch(() => undefined);
  }

  return keys.length + legacyKeys.length;
}
