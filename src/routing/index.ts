import { createOsrmProvider } from './osrm';
import type { RoutingProvider } from './types';

export type { RoutingCoordinate, RoutingDestination, RoutingProvider } from './types';

/**
 * Routing configuration lives in one place so moving from the public OSRM
 * endpoint to a self-hosted OSRM instance (or adding another provider) does not
 * require touching distance/cache consumers.
 */
export const ROUTING_CONFIG = {
  activeProvider: 'osrm',
  providers: {
    osrm: {
      baseUrl: 'https://router.project-osrm.org',
      profile: 'driving',
      requestTimeoutMs: 7000,
      // Bump to invalidate the durable route cache after a routing-data/profile
      // migration where old route distances should no longer be trusted.
      cacheVersion: 'v1',
    },
  },
} as const;

const providers: Record<string, RoutingProvider> = {
  osrm: createOsrmProvider(ROUTING_CONFIG.providers.osrm),
};

export const routingProvider = providers[ROUTING_CONFIG.activeProvider];

if (!routingProvider) {
  throw new Error(`Unknown routing provider: ${ROUTING_CONFIG.activeProvider}`);
}
