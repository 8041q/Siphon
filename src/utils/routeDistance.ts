import AsyncStorage from '@react-native-async-storage/async-storage';

const CROW_FLIES_TO_ROAD_RATIO = 1.38;
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 5000;
const CACHE_PREFIX = 'siphon:route';

function cacheKey(fromId: string, toId: string): string {
  return `${CACHE_PREFIX}:${fromId}:${toId}`;
}

const pendingRequests = new Map<string, Promise<DistanceResult>>();

export type DistanceResult = { value: number };

export function roadEstimateKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
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
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function roadDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fromId: string,
  toId: string,
): Promise<DistanceResult> {
  const key = cacheKey(fromId, toId);

  const cachedRaw = await AsyncStorage.getItem(key);
  if (cachedRaw) {
    try {
      const parsed = JSON.parse(cachedRaw) as DistanceResult;
      if (typeof parsed.value === 'number' && isFinite(parsed.value) && parsed.value > 0) {
        return parsed;
      }
    } catch {
      // corrupt cache, refetch
    }
  }

  const pendingKey = `${fromId}:${toId}`;
  const existing = pendingRequests.get(pendingKey);
  if (existing) {
    return existing;
  }

  const promise = (async (): Promise<DistanceResult> => {
    try {
      const url = `${OSRM_URL}/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
      const res = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
      if (res.ok) {
        const json = await res.json();
        const route = json?.routes?.[0];
        if (route && typeof route.distance === 'number' && route.distance > 0) {
          const km = route.distance / 1000;
          const result: DistanceResult = { value: km };
          AsyncStorage.setItem(key, JSON.stringify(result));
          return result;
        }
      }
    } catch {
      // network error, timeout — fall through to fallback
    }

    const estimate = roadEstimateKm(fromLat, fromLng, toLat, toLng);
    const result: DistanceResult = { value: estimate };
    AsyncStorage.setItem(key, JSON.stringify(result));
    return result;
  })();

  pendingRequests.set(pendingKey, promise);
  try {
    return await promise;
  } finally {
    pendingRequests.delete(pendingKey);
  }
}