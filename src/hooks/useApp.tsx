import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FuelDataClient, isFuelKey, type FuelKey, type FuelStationFeature, type CountryCode } from '../api/siphonClient';
import { RateLimitedError } from '../api/rateLimit';
import { hybridStore } from '../store/hybridStore';
import { useLocation } from './useLocation';
import { roadEstimateKm, roadDistanceKm, roadDistancesKm } from '../utils/routeDistance';
import { enrichStations } from '../utils/markerEnrichment';
import * as Haptics from 'expo-haptics';
import type { FC } from 'react';
import i18n from '../i18n';
import { beginPerf, endPerf, measureAsync } from '../utils/perf';

const ROUTING_ENRICH_LIMIT = 100;
const ROUTING_TABLE_BATCH_SIZE = 20;

type RoutingCandidate = {
  id: string;
  latitude: number;
  longitude: number;
  estimate: number;
};

/** Select the nearest N stations without allocating/sorting the full catalog. */
function selectNearestRoutingCandidates(
  stations: readonly FuelStationFeature[],
  estimates: ReadonlyMap<string, number>,
  limit: number,
): RoutingCandidate[] {
  if (limit <= 0) return [];
  const heap: RoutingCandidate[] = [];

  const siftUp = (index: number) => {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (heap[parent].estimate >= heap[index].estimate) break;
      [heap[parent], heap[index]] = [heap[index], heap[parent]];
      index = parent;
    }
  };

  const siftDown = (index: number) => {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let largest = index;
      if (left < heap.length && heap[left].estimate > heap[largest].estimate) largest = left;
      if (right < heap.length && heap[right].estimate > heap[largest].estimate) largest = right;
      if (largest === index) break;
      [heap[index], heap[largest]] = [heap[largest], heap[index]];
      index = largest;
    }
  };

  for (const station of stations) {
    const estimate = estimates.get(station.properties.id);
    if (estimate == null || !Number.isFinite(estimate)) continue;
    const [longitude, latitude] = station.geometry.coordinates;

    if (heap.length < limit) {
      heap.push({ id: station.properties.id, latitude, longitude, estimate });
      siftUp(heap.length - 1);
    } else if (estimate < heap[0].estimate) {
      heap[0] = { id: station.properties.id, latitude, longitude, estimate };
      siftDown(0);
    }
  }

  return heap.sort((a, b) => a.estimate - b.estimate);
}

interface StationCatalogState {
  allStations: FuelStationFeature[];
  getStationById: (id: string) => FuelStationFeature | undefined;
}

interface StationMapDataState {
  stations: FuelStationFeature[];
  filteredStations: FuelStationFeature[];
}

interface StationDistanceState {
  stationDistances: Map<string, number>;
  routedStationIds: ReadonlySet<string>;
  distanceLoading: boolean;
  ensureRoutedDistance: (station: FuelStationFeature) => Promise<void>;
  isDistanceRouted: (stationId: string) => boolean;
}

interface StationSyncState {
  loading: boolean;
  error: string | null;
  offline: boolean;
  rateLimited: boolean;
  syncProgress: string | null;
  reload: () => void;
}

export type StationState = StationCatalogState & StationMapDataState & StationDistanceState & StationSyncState;

interface LocationState {
  location: ReturnType<typeof useLocation>['location'];
  requestingLocation: boolean;
  refreshLocation: () => void;
  locateWithGps: () => Promise<{ latitude: number; longitude: number } | null>;
}

export type SortOption = 'price' | 'distance';

export type SearchFilter = {
  brand?: string;
  countries?: CountryCode[];
  fuelTypes?: FuelKey[];
  priceRange?: { max: number } | null;
  city?: string;
  maxDistance?: number;
  sortBy?: SortOption;
  sortByFuel?: FuelKey;
};

type MapFocusRequest = {
  requestId: number;
  stationId: string;
  coordinates: [number, number];
};

interface UIState {
  selectedStation: FuelStationFeature | null;
  mapFocusRequest: MapFocusRequest | null;
  searchFilter: SearchFilter;
  setSelectedStation: (s: FuelStationFeature | null) => void;
  requestMapFocus: (station: FuelStationFeature) => void;
  clearMapFocusRequest: (requestId: number) => void;
  setSearchFilter: (f: SearchFilter) => void;
  favorites: Set<string>;
  toggleFavorite: (station: FuelStationFeature) => void;
  historyEnabled: boolean;
  setHistoryEnabled: (enabled: boolean) => void;
}

interface Actions {
  loadStationsForRegion: (lat: number, lng: number, bounds?: [number, number, number, number]) => Promise<FuelStationFeature[]>;
}

const StationCatalogContext = createContext<StationCatalogState | null>(null);
const StationMapDataContext = createContext<StationMapDataState | null>(null);
const StationDistanceContext = createContext<StationDistanceState | null>(null);
const StationSyncContext = createContext<StationSyncState | null>(null);
const LocationContext = createContext<LocationState | null>(null);
const UIContext = createContext<UIState | null>(null);
const ActionsContext = createContext<Actions | null>(null);

export const client = new FuelDataClient({
  store: hybridStore,
  baseUrl: 'https://raw.githubusercontent.com/8041q/SiphonAPI/main',
});

const SEARCH_FILTER_KEY = 'siphon:search:filters';
const HISTORY_ENABLED_KEY = 'siphon:settings:historyEnabled';
const FAVORITES_KEY = 'siphon:favorites';

function defaultSearchFilter(): SearchFilter {
  return {};
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const {
    location,
    requesting: requestingLocation,
    hydrated: locationHydrated,
    refresh: refreshLocation,
    locateWithGps,
  } = useLocation();
  const [stations, setStations] = useState<FuelStationFeature[]>([]);
  const [allStations, setAllStations] = useState<FuelStationFeature[]>([]);
  const allStationsById = useMemo(() => {
    const index = new Map<string, FuelStationFeature>();
    for (const station of allStations) index.set(station.properties.id, station);
    return index;
  }, [allStations]);
  const getStationById = useCallback(
    (id: string) => allStationsById.get(id),
    [allStationsById],
  );
  const [stationDistances, setStationDistances] = useState<Map<string, number>>(new Map());
  const stationDistancesRef = useRef<Map<string, number>>(stationDistances);
  stationDistancesRef.current = stationDistances;
  const [routedStationIds, setRoutedStationIds] = useState<Set<string>>(new Set());
  const routedStationIdsRef = useRef<Set<string>>(routedStationIds);
  routedStationIdsRef.current = routedStationIds;
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [offline, setOffline] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<FuelStationFeature | null>(null);
  const [mapFocusRequest, setMapFocusRequest] = useState<MapFocusRequest | null>(null);
  const mapFocusRequestSeqRef = useRef(0);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>(defaultSearchFilter());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const favoritesRef = useRef<Set<string>>(favorites);
  favoritesRef.current = favorites;
  const [historyEnabled, setHistoryEnabledState] = useState(true);
  const searchFilterMutationRef = useRef(0);
  const favoritesMutationRef = useRef(0);
  const historyMutationRef = useRef(0);
  const bootLoadStartedRef = useRef(false);
  const hydrationSeqRef = useRef(0);
  const changedCountriesRef = useRef<CountryCode[]>([]);
  const regionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionWaiterRef = useRef<{ seq: number; resolve: (stations: FuelStationFeature[]) => void } | null>(null);
  const regionRequestSeqRef = useRef(0);
  const loadSeqRef = useRef(0);
  const enrichSeqRef = useRef(0);
  const enrichingRef = useRef(false);
  const autoRouteKeyRef = useRef<string | null>(null);
  const distanceLocationKeyRef = useRef<string | null>(null);
  const unmountedRef = useRef(false);

  const requestMapFocus = useCallback((station: FuelStationFeature) => {
    const [longitude, latitude] = station.geometry.coordinates;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    // Close any currently-open station sheet. The map screen consumes the
    // request after navigation and pans without adding another UI control.
    setSelectedStation(null);
    setMapFocusRequest({
      requestId: ++mapFocusRequestSeqRef.current,
      stationId: station.properties.id,
      coordinates: [longitude, latitude],
    });
  }, []);

  const clearMapFocusRequest = useCallback((requestId: number) => {
    setMapFocusRequest((current) =>
      current?.requestId === requestId ? null : current,
    );
  }, []);

  const handleSetSearchFilter = useCallback((f: SearchFilter) => {
    searchFilterMutationRef.current += 1;
    setSearchFilter(f);
    void AsyncStorage.setItem(SEARCH_FILTER_KEY, JSON.stringify(f)).catch(() => undefined);
  }, []);

  const toggleFavorite = useCallback((station: FuelStationFeature) => {
    favoritesMutationRef.current += 1;
    const id = station.properties.id;
    const next = new Set(favoritesRef.current);
    const adding = !next.has(id);
    if (adding) next.add(id);
    else next.delete(id);

    favoritesRef.current = next;
    setFavorites(next);
    if (adding) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    void AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...next])).catch(() => undefined);
  }, []);

  const setHistoryEnabled = useCallback((enabled: boolean) => {
    historyMutationRef.current += 1;
    setHistoryEnabledState(enabled);
    void AsyncStorage.setItem(HISTORY_ENABLED_KEY, String(enabled)).catch(() => undefined);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      loadSeqRef.current += 1;
      enrichSeqRef.current += 1;
      enrichingRef.current = false;
    };
  }, []);

  useEffect(() => {
    const run = ++hydrationSeqRef.current;
    const searchMutation = searchFilterMutationRef.current;
    const favoritesMutation = favoritesMutationRef.current;
    const historyMutation = historyMutationRef.current;
    void refreshLocation();

    void (async () => {
      const [historyRaw, searchRaw, favoritesRaw] = await Promise.all([
        AsyncStorage.getItem(HISTORY_ENABLED_KEY).catch(() => null),
        AsyncStorage.getItem(SEARCH_FILTER_KEY).catch(() => null),
        AsyncStorage.getItem(FAVORITES_KEY).catch(() => null),
      ]);
      if (unmountedRef.current || hydrationSeqRef.current !== run) return;

      if (historyMutationRef.current === historyMutation && historyRaw === 'false') {
        setHistoryEnabledState(false);
      }

      if (searchRaw) {
        try {
          const raw = JSON.parse(searchRaw) as Record<string, unknown>;
          const fuelTypes =
            Array.isArray(raw.fuelTypes)
              ? raw.fuelTypes.filter((value): value is FuelKey => typeof value === 'string' && isFuelKey(value))
              : typeof raw.fuelType === 'string' && isFuelKey(raw.fuelType)
                ? [raw.fuelType]
                : undefined;

          const parsed: SearchFilter = {
            brand: typeof raw.brand === 'string' ? raw.brand : undefined,
            countries: Array.isArray(raw.countries)
              ? raw.countries.filter((value): value is CountryCode => value === 'ES' || value === 'PT')
              : undefined,
            fuelTypes,
            priceRange:
              raw.priceRange && typeof raw.priceRange === 'object' &&
              typeof (raw.priceRange as { max?: unknown }).max === 'number'
                ? { max: (raw.priceRange as { max: number }).max }
                : null,
            city: typeof raw.city === 'string' ? raw.city : undefined,
            maxDistance: typeof raw.maxDistance === 'number' ? raw.maxDistance : undefined,
            sortBy: raw.sortBy === 'price' || raw.sortBy === 'distance' ? raw.sortBy : undefined,
            sortByFuel: typeof raw.sortByFuel === 'string' && isFuelKey(raw.sortByFuel) ? raw.sortByFuel : undefined,
          };
          if (searchFilterMutationRef.current === searchMutation) setSearchFilter(parsed);
        } catch {
          // Remove corrupt JSON so every future launch does not repeat the same parse.
          void AsyncStorage.removeItem(SEARCH_FILTER_KEY).catch(() => undefined);
        }
      }

      if (favoritesRaw) {
        try {
          const parsed = JSON.parse(favoritesRaw) as unknown;
          if (Array.isArray(parsed)) {
            const nextFavorites = new Set(parsed.filter((value): value is string => typeof value === 'string'));
            if (favoritesMutationRef.current === favoritesMutation) {
              favoritesRef.current = nextFavorites;
              setFavorites(nextFavorites);
            }
          }
        } catch {
          void AsyncStorage.removeItem(FAVORITES_KEY).catch(() => undefined);
        }
      }
    })();

    return () => {
      if (hydrationSeqRef.current === run) hydrationSeqRef.current += 1;
    };
  }, [refreshLocation]);

  const rebuildAllStationsData = useCallback(async (): Promise<FuelStationFeature[]> => {
    const perf = beginPerf('siphon.catalog.rebuild_from_tiles');
    try {
      const all = await client.getAllCachedStations();
      if (unmountedRef.current) return [];
      setAllStations(all);
      await client.saveAllStationsCache(all).catch(() => undefined);
      return all;
    } catch (error) {
      if (__DEV__ && !unmountedRef.current) console.warn('[rebuildAllStationsData] failed:', error);
      return [];
    } finally {
      endPerf(perf, 4);
    }
  }, []);

  const loadAllStationsData = useCallback(async (rebuildIfMissing = true): Promise<FuelStationFeature[]> => {
    const perf = beginPerf('siphon.catalog.load_aggregate');
    try {
      const cached = await client.loadAllStationsCache();
      if (unmountedRef.current) return [];
      if (cached && cached.length > 0) {
        setAllStations(cached);
        return cached;
      }
      return rebuildIfMissing ? rebuildAllStationsData() : [];
    } catch (error) {
      if (__DEV__ && !unmountedRef.current) console.warn('[loadAllStationsData] failed:', error);
      return [];
    } finally {
      endPerf(perf, 4);
    }
  }, [rebuildAllStationsData]);

  const load = useCallback(async () => {
    const perf = beginPerf('siphon.startup.sync_cycle');
    const run = ++loadSeqRef.current;
    const isActive = () => !unmountedRef.current && loadSeqRef.current === run;

    if (isActive()) {
      setLoading(true);
      setError(null);
      setOffline(false);
      setRateLimited(false);
      setSyncProgress(null);
    }

    // Read the trusted aggregate in parallel with the rate-limit gate/network
    // decision. Search/Favorites can use it immediately while a sync continues.
    const trustedCatalogPromise = loadAllStationsData(false);

    try {
      const gate = await client.rateLimiter.shouldRunSync();
      if (!isActive()) return;

      const trustedCatalog = await trustedCatalogPromise;
      if (!isActive()) return;

      if (gate === 'blocked') {
        setRateLimited(true);
        const cached = trustedCatalog.length > 0 ? trustedCatalog : await loadAllStationsData(true);
        if (isActive() && cached.length === 0) {
          setError(i18n.t('common.something_went_wrong'));
        }
        return;
      }
      if (gate === 'cooldown') {
        if (trustedCatalog.length === 0) await loadAllStationsData(true);
        return;
      }

      setSyncProgress(i18n.t('sync.checking_updates'));
      const result = await measureAsync(
        'siphon.startup.check_updates',
        () => client.checkForUpdates(),
        2,
      );
      if (!isActive()) return;

      setOffline(result.offline);

      if (result.offline) {
        changedCountriesRef.current = [];
        const cached = trustedCatalog.length > 0 ? trustedCatalog : await loadAllStationsData(true);
        if (isActive() && cached.length === 0) setError(i18n.t('sync.no_connection'));
        return;
      }

      changedCountriesRef.current = result.changedCountries;
      const cacheNeedsVerification = await client.stationCacheNeedsVerification();
      if (!isActive()) return;

      // A committed root + verified aggregate means unchanged station countries
      // need no per-tile disk walk at all. Missing/old caches still take the full
      // sync/verification path so repair behavior is preserved.
      const needsStationSync =
        result.changedCountries.length > 0 ||
        trustedCatalog.length === 0 ||
        cacheNeedsVerification;

      if (needsStationSync) {
        setSyncProgress(i18n.t('sync.syncing_data'));
        await measureAsync(
          'siphon.startup.station_sync',
          () => client.syncAll(result.changedCountries, (loaded, total) => {
            if (!isActive()) return;
            if (total > 0 && result.changedCountries.length > 0) {
              setSyncProgress(i18n.t('sync.syncing_progress', { loaded, total }));
            }
          }),
          4,
        );
        if (!isActive()) return;
      }

      if (result.root) {
        await client.commitRootManifest(result.root, result.etag);
        if (!isActive()) return;
      }

      changedCountriesRef.current = [];

      if ((await AsyncStorage.getItem(HISTORY_ENABLED_KEY).catch(() => null)) !== 'false') {
        await measureAsync(
          'siphon.startup.history_sync',
          () => client.checkHistoryUpdates(),
          4,
        );
      }
      if (!isActive()) return;

      await measureAsync(
        'siphon.startup.commodity_sync',
        () => client.refreshCommodityDashboard().then(() => undefined).catch(() => undefined),
        2,
      );

      if (result.changedCountries.length > 0 || trustedCatalog.length === 0) {
        await rebuildAllStationsData();
      }
      if (!isActive()) return;

      await client.rateLimiter.recordSyncCompleted().catch(() => undefined);
    } catch (error: unknown) {
      changedCountriesRef.current = [];
      if (!isActive()) return;

      const cached = await loadAllStationsData(true);
      if (!isActive()) return;

      if (error instanceof RateLimitedError) {
        setRateLimited(true);
        if (cached.length === 0) setError(i18n.t('common.something_went_wrong'));
      } else if (cached.length > 0) {
        setOffline(true);
      } else {
        const message = error instanceof Error ? error.message : i18n.t('common.something_went_wrong');
        setError(message);
      }
    } finally {
      endPerf(perf, 4);
      if (isActive()) {
        setLoading(false);
        setSyncProgress(null);
      }
    }
  }, [loadAllStationsData, rebuildAllStationsData]);

  useEffect(() => {
    if (!locationHydrated || bootLoadStartedRef.current) return;
    bootLoadStartedRef.current = true;
    void load();
  }, [locationHydrated, load]);

  // Keep an already-open detail sheet attached to the freshest station object
  // after a successful sync/cache rebuild. Without this, the map/list can show
  // new prices while the sheet keeps the pre-sync object until it is reopened.
  useEffect(() => {
    if (loading || !selectedStation || allStations.length === 0) return;
    const latest = allStationsById.get(selectedStation.properties.id);
    if (latest && latest !== selectedStation) setSelectedStation(latest);
  }, [allStations.length, allStationsById, loading, selectedStation]);

  const locationRouteKey = useCallback((lat: number, lng: number) => {
    return `${Math.round(lat * 1000)}:${Math.round(lng * 1000)}`;
  }, []);

  // Instant road-shaped estimates for every station. These render immediately;
  // precise routed distances replace the nearest values in the background once GPS
  // (not merely the approximate cached location) is available.
  useEffect(() => {
    if (!allStations.length) return;
    if (location.latitude === 0 && location.longitude === 0) return;

    enrichSeqRef.current += 1;
    enrichingRef.current = false;
    autoRouteKeyRef.current = null;
    setDistanceLoading(false);

    const userLat = location.latitude;
    const userLng = location.longitude;
    distanceLocationKeyRef.current = locationRouteKey(userLat, userLng);

    const estimatePerf = beginPerf('siphon.routing.build_estimates');
    const map = new Map<string, number>();
    for (const station of allStations) {
      const [stationLng, stationLat] = station.geometry.coordinates;
      if (!Number.isFinite(stationLat) || !Number.isFinite(stationLng)) continue;
      const estimate = roadEstimateKm(userLat, userLng, stationLat, stationLng);
      if (Number.isFinite(estimate)) map.set(station.properties.id, estimate);
    }
    endPerf(estimatePerf, 4);
    stationDistancesRef.current = map;
    setStationDistances(map);
    const emptyRouted = new Set<string>();
    routedStationIdsRef.current = emptyRouted;
    setRoutedStationIds(emptyRouted);
  }, [allStations, location.latitude, location.longitude, locationRouteKey]);

  // Route the nearest stations automatically in small provider batches. This
  // replaces the old "improve calculation" button while keeping request volume
  // bounded and preserving instant estimates if OSRM is unavailable.
  const refineNearbyDistances = useCallback(async () => {
    if (enrichingRef.current) return;
    const { latitude: lat, longitude: lng } = location;
    if (location.approximate || !allStations.length) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const routeKey = locationRouteKey(lat, lng);
    if (distanceLocationKeyRef.current !== routeKey) return;

    const run = ++enrichSeqRef.current;
    enrichingRef.current = true;
    if (!unmountedRef.current) {
      setDistanceLoading(true);
    }

    const routingPerf = beginPerf('siphon.routing.refine_nearby');
    try {
      const userId = `user:${routeKey}`;
      const estimates = stationDistancesRef.current;
      const ranked = selectNearestRoutingCandidates(allStations, estimates, ROUTING_ENRICH_LIMIT);

      // The estimate effect already built the complete map for this exact
      // location bucket. Copy it instead of recalculating ~14k haversine values.
      const map = new Map<string, number>(estimates);
      for (let i = 0; i < ranked.length; i += ROUTING_TABLE_BATCH_SIZE) {
        if (unmountedRef.current || enrichSeqRef.current !== run || distanceLocationKeyRef.current !== routeKey) return;
        const batch = ranked.slice(i, i + ROUTING_TABLE_BATCH_SIZE);
        const batchResults = await roadDistancesKm(lat, lng, batch, userId);
        if (unmountedRef.current || enrichSeqRef.current !== run || distanceLocationKeyRef.current !== routeKey) return;

        const newlyRouted: string[] = [];
        for (const point of batch) {
          const result = batchResults.get(point.id);
          if (!result || !Number.isFinite(result.value) || result.source !== 'route') continue;
          map.set(point.id, result.value);
          newlyRouted.push(point.id);
        }

        // Publish only real route improvements. When OSRM is unavailable the
        // estimates are already in the map, so avoid five no-op list/map renders.
        // A selected station can be routed independently while table batches run,
        // so union IDs instead of replacing the routed set.
        if (newlyRouted.length > 0) {
          const nextDistances = new Map(map);
          stationDistancesRef.current = nextDistances;
          setStationDistances(nextDistances);
          setRoutedStationIds((current) => {
            const next = new Set(current);
            for (const id of newlyRouted) next.add(id);
            routedStationIdsRef.current = next;
            return next;
          });
        }
      }
    } finally {
      endPerf(routingPerf, 4);
      if (!unmountedRef.current && enrichSeqRef.current === run) {
        setDistanceLoading(false);
        enrichingRef.current = false;
      }
    }
  }, [allStations, location, locationRouteKey]);

  // Automatically refine after a precise location is available. The key is
  // location-bucket + station count so a successful data sync at the same GPS
  // position can refine newly-added stations once without looping on renders.
  useEffect(() => {
    if (location.approximate || !allStations.length) return;
    const key = `${locationRouteKey(location.latitude, location.longitude)}:${allStations.length}`;
    if (autoRouteKeyRef.current === key) return;
    autoRouteKeyRef.current = key;
    void refineNearbyDistances();
  }, [allStations.length, refineNearbyDistances, location.approximate, location.latitude, location.longitude, locationRouteKey]);

  const isDistanceRouted = useCallback(
    (stationId: string) => routedStationIdsRef.current.has(stationId),
    [],
  );

  // A station opened from search/favorites can be outside the nearest automatic
  // batch. Refine that one station immediately so trip economics use a real
  // route whenever the active provider is reachable.
  const ensureRoutedDistance = useCallback(async (station: FuelStationFeature) => {
    if (location.approximate || routedStationIdsRef.current.has(station.properties.id)) return;
    const lat = location.latitude;
    const lng = location.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const routeKey = locationRouteKey(lat, lng);
    if (distanceLocationKeyRef.current !== routeKey) return;

    const [stationLng, stationLat] = station.geometry.coordinates;
    const result = await roadDistanceKm(
      lat,
      lng,
      stationLat,
      stationLng,
      `user:${routeKey}`,
      station.properties.id,
    );
    if (unmountedRef.current || distanceLocationKeyRef.current !== routeKey) return;

    if (Number.isFinite(result.value)) {
      setStationDistances((current) => {
        const next = new Map(current);
        next.set(station.properties.id, result.value);
        stationDistancesRef.current = next;
        return next;
      });
    }
    if (result.source === 'route') {
      setRoutedStationIds((current) => {
        if (current.has(station.properties.id)) return current;
        const next = new Set(current);
        next.add(station.properties.id);
        routedStationIdsRef.current = next;
        return next;
      });
    }
  }, [location, locationRouteKey]);

  useEffect(() => {
    if (!selectedStation) return;
    void ensureRoutedDistance(selectedStation);
  }, [ensureRoutedDistance, selectedStation]);

  useEffect(() => {
    return () => {
      if (regionTimerRef.current) {
        clearTimeout(regionTimerRef.current);
        regionTimerRef.current = null;
      }
      regionRequestSeqRef.current += 1;
      regionWaiterRef.current?.resolve([]);
      regionWaiterRef.current = null;
    };
  }, []);

  const loadStationsForRegion = useCallback(
    (lat: number, lng: number, bounds?: [number, number, number, number]) => {
      return new Promise<FuelStationFeature[]>((resolve) => {
        if (regionTimerRef.current) {
          clearTimeout(regionTimerRef.current);
          regionTimerRef.current = null;
        }

        // Resolve the previous debounced/in-flight caller immediately. Its native
        // request may still finish, but the sequence guard below prevents stale data.
        regionWaiterRef.current?.resolve([]);

        const seq = ++regionRequestSeqRef.current;
        regionWaiterRef.current = { seq, resolve };

        regionTimerRef.current = setTimeout(async () => {
          regionTimerRef.current = null;
          const regionPerf = beginPerf('siphon.map.load_region');
          try {
            const nearby = await client.getStationsNear(lat, lng, changedCountriesRef.current, bounds);
            if (unmountedRef.current || regionRequestSeqRef.current !== seq) {
              resolve([]);
              return;
            }

            setStations(enrichStations(nearby));
            resolve(nearby);
          } catch (error) {
            if (__DEV__ && !unmountedRef.current && regionRequestSeqRef.current === seq) {
              console.warn('[loadStationsForRegion] failed:', error);
            }
            resolve([]);
          } finally {
            endPerf(regionPerf, 2);
            if (regionWaiterRef.current?.seq === seq) {
              regionWaiterRef.current = null;
            }
          }
        }, 50);
      });
    },
    [],
  );

  const distanceFilterMap = searchFilter.maxDistance ? stationDistances : null;

  const filteredStations = useMemo(() => {
    let result = stations;
    const countries = searchFilter.countries;
    const fuelTypes = searchFilter.fuelTypes;
    const cityQuery = searchFilter.city?.trim().toLowerCase();

    if (searchFilter.brand?.trim()) {
      const query = searchFilter.brand.trim().toLowerCase();
      result = result.filter(
        (station) =>
          (station.properties.brand ?? '').toLowerCase().includes(query) ||
          (station.properties.name ?? '').toLowerCase().includes(query),
      );
    }

    if (countries?.length) {
      result = result.filter((station) => countries.includes(station.properties.source));
    }

    if (fuelTypes?.length) {
      result = result.filter((station) => {
        const fuels = station.properties.fuels ?? {};
        return fuelTypes.some((key) => key in fuels);
      });
    }

    if (searchFilter.priceRange) {
      const max = searchFilter.priceRange.max;
      result = result.filter((station) => {
        const fuels = station.properties.fuels ?? {};
        if (fuelTypes?.length) {
          return fuelTypes.some((key) => typeof fuels[key] === 'number' && fuels[key] < max);
        }
        return Object.values(fuels).some((price) => Number(price) < max);
      });
    }

    if (cityQuery) {
      result = result.filter((station) => {
        const properties = station.properties;
        const administrativeArea =
          properties.source === 'PT' ? properties.district : properties.province;
        return (
          properties.municipality.toLowerCase().includes(cityQuery) ||
          administrativeArea.toLowerCase().includes(cityQuery) ||
          properties.address.toLowerCase().includes(cityQuery)
        );
      });
    }

    if (
      searchFilter.maxDistance &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      (location.latitude !== 0 || location.longitude !== 0)
    ) {
      const maxDistance = searchFilter.maxDistance;
      result = result.filter((station) => {
        const knownDistance = distanceFilterMap?.get(station.properties.id);
        if (knownDistance != null && Number.isFinite(knownDistance)) {
          return knownDistance <= maxDistance;
        }
        const [stationLng, stationLat] = station.geometry.coordinates;
        return roadEstimateKm(
          location.latitude,
          location.longitude,
          stationLat,
          stationLng,
        ) <= maxDistance;
      });
    }

    // Sorting is intentionally not done here: this collection feeds the map,
    // where order is irrelevant. Avoiding a distance sort keeps the GeoJSON
    // source stable when only the user's location changes. Search owns its own
    // list sorting logic.
    return result;
  }, [
    stations,
    searchFilter.brand,
    searchFilter.countries,
    searchFilter.fuelTypes,
    searchFilter.priceRange,
    searchFilter.city,
    searchFilter.maxDistance,
    location.latitude,
    location.longitude,
    distanceFilterMap,
  ]);

  const stationCatalogValue = useMemo<StationCatalogState>(
    () => ({
      allStations,
      getStationById,
    }),
    [allStations, getStationById],
  );

  const stationMapDataValue = useMemo<StationMapDataState>(
    () => ({
      stations,
      filteredStations,
    }),
    [stations, filteredStations],
  );

  const stationDistanceValue = useMemo<StationDistanceState>(
    () => ({
      stationDistances,
      routedStationIds,
      distanceLoading,
      ensureRoutedDistance,
      isDistanceRouted,
    }),
    [
      stationDistances,
      routedStationIds,
      distanceLoading,
      ensureRoutedDistance,
      isDistanceRouted,
    ],
  );

  const stationSyncValue = useMemo<StationSyncState>(
    () => ({
      loading,
      error,
      offline,
      rateLimited,
      syncProgress,
      reload: load,
    }),
    [loading, error, offline, rateLimited, syncProgress, load],
  );

  const locationValue = useMemo<LocationState>(
    () => ({
      location,
      requestingLocation,
      refreshLocation,
      locateWithGps,
    }),
    [location, requestingLocation, refreshLocation, locateWithGps]
  );

  const uiValue = useMemo<UIState>(
    () => ({
      selectedStation,
      mapFocusRequest,
      searchFilter,
      setSelectedStation,
      requestMapFocus,
      clearMapFocusRequest,
      setSearchFilter: handleSetSearchFilter,
      favorites,
      toggleFavorite,
      historyEnabled,
      setHistoryEnabled,
    }),
    [selectedStation, mapFocusRequest, searchFilter, favorites, toggleFavorite, handleSetSearchFilter, historyEnabled, setHistoryEnabled, requestMapFocus, clearMapFocusRequest]
  );

  const actionsValue = useMemo<Actions>(
    () => ({
      loadStationsForRegion,
    }),
    [loadStationsForRegion]
  );

  return (
    <StationCatalogContext.Provider value={stationCatalogValue}>
      <StationMapDataContext.Provider value={stationMapDataValue}>
        <StationDistanceContext.Provider value={stationDistanceValue}>
          <StationSyncContext.Provider value={stationSyncValue}>
            <LocationContext.Provider value={locationValue}>
              <UIContext.Provider value={uiValue}>
                <ActionsContext.Provider value={actionsValue}>
                  {children}
                </ActionsContext.Provider>
              </UIContext.Provider>
            </LocationContext.Provider>
          </StationSyncContext.Provider>
        </StationDistanceContext.Provider>
      </StationMapDataContext.Provider>
    </StationCatalogContext.Provider>
  );
}

export function useStationCatalog(): StationCatalogState {
  const ctx = useContext(StationCatalogContext);
  if (!ctx) throw new Error('useStationCatalog must be used within AppProvider');
  return ctx;
}

export function useStationMapData(): StationMapDataState {
  const ctx = useContext(StationMapDataContext);
  if (!ctx) throw new Error('useStationMapData must be used within AppProvider');
  return ctx;
}

export function useStationDistances(): StationDistanceState {
  const ctx = useContext(StationDistanceContext);
  if (!ctx) throw new Error('useStationDistances must be used within AppProvider');
  return ctx;
}

export function useStationSync(): StationSyncState {
  const ctx = useContext(StationSyncContext);
  if (!ctx) throw new Error('useStationSync must be used within AppProvider');
  return ctx;
}

/**
 * Compatibility hook for callers that genuinely need the complete station
 * surface. Prefer the narrower hooks above in render-heavy components.
 */
export function useStations(): StationState {
  return {
    ...useStationCatalog(),
    ...useStationMapData(),
    ...useStationDistances(),
    ...useStationSync(),
  };
}

export function useLocationState(): LocationState {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationState must be used within AppProvider');
  return ctx;
}

export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within AppProvider');
  return ctx;
}

export function useActions(): Actions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useActions must be used within AppProvider');
  return ctx;
}

export function useApp(): StationState & LocationState & UIState & Actions {
  const stations = useStations();
  const location = useLocationState();
  const ui = useUI();
  const actions = useActions();
  return { ...stations, ...location, ...ui, ...actions };
}