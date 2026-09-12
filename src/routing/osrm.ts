import type { RoutingCoordinate, RoutingDestination, RoutingProvider } from './types';

type OsrmProviderOptions = {
  baseUrl: string;
  profile?: string;
  requestTimeoutMs?: number;
  cacheVersion?: string;
};

function validCoordinate(point: RoutingCoordinate): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Siphon/1.0 (+https://github.com/8041q/SiphonAPI)',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function createOsrmProvider(options: OsrmProviderOptions): RoutingProvider {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const profile = options.profile ?? 'driving';
  const timeoutMs = options.requestTimeoutMs ?? 7000;
  const cacheVersion = options.cacheVersion ?? 'v1';

  return {
    id: 'osrm',
    cacheNamespace: `osrm-${profile}-${cacheVersion}`,

    async routeDistanceKm(origin, destination) {
      if (!validCoordinate(origin) || !validCoordinate(destination)) return null;
      try {
        const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
        const url = `${baseUrl}/route/v1/${profile}/${coordinates}?overview=false`;
        const response = await fetchWithTimeout(url, timeoutMs);
        if (!response.ok) return null;

        const body = (await response.json()) as {
          code?: string;
          routes?: Array<{ distance?: number }>;
        };
        const meters = body.code === 'Ok' ? body.routes?.[0]?.distance : undefined;
        return typeof meters === 'number' && Number.isFinite(meters) && meters > 0
          ? meters / 1000
          : null;
      } catch {
        return null;
      }
    },

    async tableDistancesKm(origin, destinations) {
      const result = new Map<string, number>();
      if (!validCoordinate(origin) || destinations.length === 0) return result;

      const validDestinations = destinations.filter(validCoordinate);
      if (validDestinations.length === 0) return result;

      try {
        const coordinates = [
          `${origin.longitude},${origin.latitude}`,
          ...validDestinations.map((point) => `${point.longitude},${point.latitude}`),
        ].join(';');
        const destinationIndexes = validDestinations.map((_, index) => index + 1).join(';');
        const url = `${baseUrl}/table/v1/${profile}/${coordinates}?sources=0&destinations=${destinationIndexes}&annotations=distance&skip_waypoints=true`;
        const response = await fetchWithTimeout(url, timeoutMs);
        if (!response.ok) return result;

        const body = (await response.json()) as {
          code?: string;
          distances?: Array<Array<number | null>>;
        };
        const row = body.code === 'Ok' ? body.distances?.[0] : undefined;
        if (!row) return result;

        validDestinations.forEach((point, index) => {
          const meters = row[index];
          if (typeof meters === 'number' && Number.isFinite(meters) && meters > 0) {
            result.set(point.id, meters / 1000);
          }
        });
      } catch {
        // Callers retain their local estimates and can retry next time.
      }

      return result;
    },
  };
}
