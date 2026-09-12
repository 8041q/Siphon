export type RoutingCoordinate = {
  latitude: number;
  longitude: number;
};

export type RoutingDestination = RoutingCoordinate & {
  id: string;
};

/**
 * Minimal routing contract used by the app. Add another provider by
 * implementing this interface and registering it in `./index.ts`.
 */
export interface RoutingProvider {
  /** Stable provider identifier used for diagnostics. */
  readonly id: string;
  /**
   * Bump this whenever cached distances produced by this provider should be
   * invalidated (profile/data semantics change, provider migration, etc.).
   */
  readonly cacheNamespace: string;

  routeDistanceKm(
    origin: RoutingCoordinate,
    destination: RoutingDestination,
  ): Promise<number | null>;

  /** Optional efficient one-source / many-destination API. */
  tableDistancesKm?(
    origin: RoutingCoordinate,
    destinations: readonly RoutingDestination[],
  ): Promise<Map<string, number>>;
}
