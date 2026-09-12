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

const OSRM_ENRICH_LIMIT = 100;
const OSRM_TABLE_BATCH_SIZE = 20;

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

interface UIState {
  selectedStation: FuelStationFeature | null;
  searchFilter: SearchFilter;
  setSelectedStation: (s: FuelStationFeature | null) => void;
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
  const [searchFilter, setSearchFilter] = useState<SearchFilter>(defaultSearchFilter());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const favoritesRef = useRef<Set<string>>(favorites);
  favoritesRef.current = favorites;
  const [historyEnabled, setHistoryEnabledState] = useState(true);
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

  const handleSetSearchFilter = useCallback((f: SearchFilter) => {
    setSearchFilter(f);
    void AsyncStorage.setItem(SEARCH_FILTER_KEY, JSON.stringify(f)).catch(() => undefined);
  }, []);

  const toggleFavorite = useCallback((station: FuelStationFeature) => {
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
    void refreshLocation();

    void (async () => {
      const [historyRaw, searchRaw, favoritesRaw] = await Promise.all([
        AsyncStorage.getItem(HISTORY_ENABLED_KEY).catch(() => null),
        AsyncStorage.getItem(SEARCH_FILTER_KEY).catch(() => null),
        AsyncStorage.getItem(FAVORITES_KEY).catch(() => null),
      ]);
      if (unmountedRef.current || hydrationSeqRef.current !== run) return;

      if (historyRaw === 'false') setHistoryEnabledState(false);

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
          setSearchFilter(parsed);
        } catch {
          // Ignore corrupt persisted filters.
        }
      }

      if (favoritesRaw) {
        try {
          const parsed = JSON.parse(favoritesRaw) as unknown;
          if (Array.isArray(parsed)) {
            const nextFavorites = new Set(parsed.filter((value): value is string => typeof value === 'string'));
            favoritesRef.current = nextFavorites;
            setFavorites(nextFavorites);
          }
        } catch {
          // Ignore corrupt persisted favorites.
        }
      }
    })();

    return () => {
      if (hydrationSeqRef.current === run) hydrationSeqRef.current += 1;
    };
  }, [refreshLocation]);

  const rebuildAllStationsData = useCallback(async (): Promise<FuelStationFeature[]> => {
    try {
      const all = await client.getAllCachedStations();
      if (unmountedRef.current) return [];
      setAllStations(all);
      await client.saveAllStationsCache(all).catch(() => undefined);
      return all;
    } catch (error) {
      if (!unmountedRef.current) console.warn('[rebuildAllStationsData] failed:', error);
      return [];
    }
  }, []);

  const loadAllStationsData = useCallback(async (): Promise<FuelStationFeature[]> => {
    try {
      const cached = await client.loadAllStationsCache();
      if (unmountedRef.current) return [];
      if (cached && cached.length > 0) {
        setAllStations(cached);
        return cached;
      }
      return rebuildAllStationsData();
    } catch (error) {
      if (!unmountedRef.current) console.warn('[loadAllStationsData] failed:', error);
      return [];
    }
  }, [rebuildAllStationsData]);

  const load = useCallback(async () => {
    const run = ++loadSeqRef.current;
    const isActive = () => !unmountedRef.current && loadSeqRef.current === run;

    if (isActive()) {
      setLoading(true);
      setError(null);
      setOffline(false);
      setRateLimited(false);
      setSyncProgress(null);
    }

    try {
      // Hard guard: if we're inside a GitHub backoff window or the hourly
      // budget is gone, run entirely from cache. Cooldown is intentionally silent.
      const gate = await client.rateLimiter.shouldRunSync();
      if (!isActive()) return;

      if (gate === 'blocked') {
        setRateLimited(true);
        const cached = await loadAllStationsData();
        if (isActive() && cached.length === 0) {
          setError(i18n.t('common.something_went_wrong'));
        }
        return;
      }
      if (gate === 'cooldown') {
        await loadAllStationsData();
        return;
      }

      setSyncProgress(i18n.t('sync.checking_updates'));
      const result = await client.checkForUpdates();
      if (!isActive()) return;

      setOffline(result.offline);

      // A failed root-manifest request already tells us the network is not
      // usable. Do not immediately follow it with manifest/tile/history calls.
      if (result.offline) {
        changedCountriesRef.current = [];
        const cached = await loadAllStationsData();
        if (isActive() && cached.length === 0) setError(i18n.t('sync.no_connection'));
        return;
      }

      changedCountriesRef.current = result.changedCountries;
      setSyncProgress(i18n.t('sync.syncing_data'));

      await client.syncAll(result.changedCountries, (loaded, total) => {
        if (!isActive()) return;
        if (total > 0 && result.changedCountries.length > 0) {
          setSyncProgress(i18n.t('sync.syncing_progress', { loaded, total }));
        }
      });
      if (!isActive()) return;

      if (result.root) {
        await client.commitRootManifest(result.root, result.etag);
        if (!isActive()) return;
      }

      // Country hashes are now reflected in local manifests/tiles. Keeping this
      // list around would make every later map pan re-fetch those manifests.
      changedCountriesRef.current = [];

      if ((await AsyncStorage.getItem(HISTORY_ENABLED_KEY).catch(() => null)) !== 'false') {
        await client.checkHistoryUpdates();
      }
      if (!isActive()) return;

      await client.refreshCommodityDashboard().catch(() => undefined);
      if (result.changedCountries.length > 0) {
        await rebuildAllStationsData();
      } else {
        await loadAllStationsData();
      }
      if (!isActive()) return;

      // Cooldown means the previous sync actually completed successfully.
      await client.rateLimiter.recordSyncCompleted().catch(() => undefined);
    } catch (error: unknown) {
      changedCountriesRef.current = [];
      if (!isActive()) return;

      // Network/rate-limit failures should still leave the app usable when
      // local station data exists.
      const cached = await loadAllStationsData();
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
  // precise OSRM routes replace the nearest values in the background once GPS
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

    const map = new Map<string, number>();
    for (const station of allStations) {
      const [stationLng, stationLat] = station.geometry.coordinates;
      if (!Number.isFinite(stationLat) || !Number.isFinite(stationLng)) continue;
      const estimate = roadEstimateKm(userLat, userLng, stationLat, stationLng);
      if (Number.isFinite(estimate)) map.set(station.properties.id, estimate);
    }
    setStationDistances(map);
    const emptyRouted = new Set<string>();
    routedStationIdsRef.current = emptyRouted;
    setRoutedStationIds(emptyRouted);
  }, [allStations, location.latitude, location.longitude, locationRouteKey]);

  // Route the nearest stations automatically in small OSRM Table batches. This
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

    try {
      const userId = `user:${routeKey}`;
      const ranked = allStations
        .map((station) => {
          const [longitude, latitude] = station.geometry.coordinates;
          const estimate = roadEstimateKm(lat, lng, latitude, longitude);
          if (!Number.isFinite(estimate)) return null;
          return { id: station.properties.id, latitude, longitude, estimate };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.estimate - b.estimate)
        .slice(0, OSRM_ENRICH_LIMIT);

      // Build from fresh estimates instead of the state ref so a location change
      // can never seed this run with distances from the previous position.
      const map = new Map<string, number>();
      for (const station of allStations) {
        const [stationLng, stationLat] = station.geometry.coordinates;
        const estimate = roadEstimateKm(lat, lng, stationLat, stationLng);
        if (Number.isFinite(estimate)) map.set(station.properties.id, estimate);
      }
      for (let i = 0; i < ranked.length; i += OSRM_TABLE_BATCH_SIZE) {
        if (unmountedRef.current || enrichSeqRef.current !== run || distanceLocationKeyRef.current !== routeKey) return;
        const batch = ranked.slice(i, i + OSRM_TABLE_BATCH_SIZE);
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
          setStationDistances(new Map(map));
          setRoutedStationIds((current) => {
            const next = new Set(current);
            for (const id of newlyRouted) next.add(id);
            routedStationIdsRef.current = next;
            return next;
          });
        }
      }
    } finally {
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
  // route whenever OSRM is reachable.
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
          try {
            const nearby = await client.getStationsNear(lat, lng, changedCountriesRef.current, bounds);
            if (unmountedRef.current || regionRequestSeqRef.current !== seq) {
              resolve([]);
              return;
            }

            setStations(enrichStations(nearby));
            resolve(nearby);
          } catch (error) {
            if (!unmountedRef.current && regionRequestSeqRef.current === seq) {
              console.warn('[loadStationsForRegion] failed:', error);
            }
            resolve([]);
          } finally {
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
      searchFilter,
      setSelectedStation,
      setSearchFilter: handleSetSearchFilter,
      favorites,
      toggleFavorite,
      historyEnabled,
      setHistoryEnabled,
    }),
    [selectedStation, searchFilter, favorites, toggleFavorite, handleSetSearchFilter, historyEnabled, setHistoryEnabled]
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