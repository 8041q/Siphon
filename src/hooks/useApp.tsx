import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FuelDataClient, FuelStationFeature, CountryCode } from '../api/siphonClient';
import { hybridStore } from '../store/hybridStore';
import { useLocation } from './useLocation';
import { haversineKm } from '../utils/location';
import * as Haptics from 'expo-haptics';
import type { FC } from 'react';
import i18n from '../i18n';

interface StationState {
  stations: FuelStationFeature[];
  allStations: FuelStationFeature[];
  stationDistances: Map<string, number>;
  loading: boolean;
  error: string | null;
  offline: boolean;
  syncProgress: string | null;
  filteredStations: FuelStationFeature[];
  reload: () => void;
}

interface LocationState {
  location: ReturnType<typeof useLocation>['location'];
  requestingLocation: boolean;
  refreshLocation: () => void;
  locateWithGps: () => Promise<{ latitude: number; longitude: number } | null>;
}

export type SearchFilter = {
  brand?: string;
  countries?: CountryCode[];
  fuelTypes?: string[];
  priceRange?: { max: number } | null;
  city?: string;
  maxDistance?: number;
};

interface UIState {
  selectedStation: FuelStationFeature | null;
  searchFilter: SearchFilter;
  setSelectedStation: (s: FuelStationFeature | null) => void;
  setSearchFilter: (f: SearchFilter) => void;
  favorites: Set<string>;
  toggleFavorite: (station: FuelStationFeature) => void;
}

interface Actions {
  loadStationsForRegion: (lat: number, lng: number, bounds?: [number, number, number, number]) => Promise<void>;
}

const StationContext = createContext<StationState | null>(null);
const LocationContext = createContext<LocationState | null>(null);
const UIContext = createContext<UIState | null>(null);
const ActionsContext = createContext<Actions | null>(null);

export const client = new FuelDataClient({
  store: hybridStore,
  baseUrl: 'https://raw.githubusercontent.com/8041q/SiphonAPI/main',
});

const SEARCH_FILTER_KEY = 'siphon:search:filters';

function defaultSearchFilter(): SearchFilter {
  return {};
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { location, requesting: requestingLocation, refresh: refreshLocation, locateWithGps } = useLocation();
  const [stations, setStations] = useState<FuelStationFeature[]>([]);
  const [allStations, setAllStations] = useState<FuelStationFeature[]>([]);
  const [stationDistances, setStationDistances] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<FuelStationFeature | null>(null);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>(defaultSearchFilter());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const started = useRef(false);
  const changedCountriesRef = useRef<CountryCode[]>([]);
  const regionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const handleSetSearchFilter = useCallback((f: SearchFilter) => {
    setSearchFilter(f);
    AsyncStorage.setItem(SEARCH_FILTER_KEY, JSON.stringify(f));
  }, []);

  const toggleFavorite = useCallback((station: FuelStationFeature) => {
    const id = station.properties.id;
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    return () => { unmountedRef.current = true; };
  }, []);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      refreshLocation();
      AsyncStorage.getItem(SEARCH_FILTER_KEY).then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val) as SearchFilter;
            if ('fuelType' in parsed && !('fuelTypes' in parsed)) {
              (parsed as any).fuelTypes = parsed.fuelType ? [parsed.fuelType] : undefined;
              delete (parsed as any).fuelType;
            }
            setSearchFilter(parsed);
          } catch {}
        }
      });
    }
  }, [refreshLocation]);

  const loadAllStationsData = useCallback(async () => {
    try {
      const cached = await client.loadAllStationsCache();
      if (cached && cached.length > 0) {
        setAllStations(cached);
        return;
      }
      const all = await client.getAllCachedStations();
      if (unmountedRef.current) return;
      setAllStations(all);
      await client.saveAllStationsCache(all);
    } catch (e) {
      console.warn('[loadAllStationsData] failed:', e);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOffline(false);
    setSyncProgress(null);

    try {
      setSyncProgress(i18n.t('sync.checking_updates'));
      const result = await client.checkForUpdates();
      setOffline(result.offline);
      changedCountriesRef.current = result.changedCountries;

      setSyncProgress(i18n.t('sync.syncing_data'));
      await client.syncAll(result.changedCountries, (loaded, total) => {
        if (total > 0 && result.changedCountries.length > 0) {
          setSyncProgress(i18n.t('sync.syncing_progress', { loaded, total }));
        }
      });

      await client.recordDailySnapshot();
      await loadAllStationsData();

      if (result.offline) {
        setError(i18n.t('sync.no_connection'));
      }
    } catch (e: any) {
      setError(e.message ?? i18n.t('common.something_went_wrong'));
    } finally {
      setLoading(false);
      setSyncProgress(null);
    }
  }, []);

  useEffect(() => {
    if (started.current && !requestingLocation) {
      load();
    }
  }, [requestingLocation, load]);

  useEffect(() => {
    if (!allStations.length) return;
    const round = (n: number) => Math.round(n * 100) / 100;
    const cacheKey = `siphon:distances:${round(location.latitude)}:${round(location.longitude)}`;

    (async () => {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        try {
          setStationDistances(new Map(Object.entries(JSON.parse(cached))));
          return;
        } catch {}
      }

      const map = new Map<string, number>();
      for (const s of allStations) {
        const [slng, slat] = s.geometry.coordinates;
        map.set(s.properties.id, haversineKm(location.latitude, location.longitude, slat, slng));
      }

      setStationDistances(map);
      AsyncStorage.setItem(cacheKey, JSON.stringify(Object.fromEntries(map)));
    })();
  }, [allStations, location]);

  useEffect(() => {
    return () => {
      if (regionTimerRef.current) {
        clearTimeout(regionTimerRef.current);
        regionTimerRef.current = null;
      }
    };
  }, []);

  const loadStationsForRegion = useCallback(async (lat: number, lng: number, bounds?: [number, number, number, number]) => {
    if (regionTimerRef.current) clearTimeout(regionTimerRef.current);
    regionTimerRef.current = setTimeout(async () => {
      console.warn('[loadStationsForRegion] lat/lng/bounds:', { lat, lng, bounds, changedCountries: changedCountriesRef.current });
      try {
        const nearby = await client.getStationsNear(lat, lng, changedCountriesRef.current, bounds);
        console.warn('[loadStationsForRegion] got', nearby.length, 'stations');
        if (unmountedRef.current) return;
        setStations(nearby);
      } catch (e) {
        console.warn('[loadStationsForRegion] failed:', e);
      }
    }, 50);
  }, []);

  const filteredStations = useMemo(() => {
    let result = stations;
    if (searchFilter.brand) {
      const q = searchFilter.brand.toLowerCase();
      result = result.filter(
        (s) =>
          (s.properties.brand ?? '').toLowerCase().includes(q) ||
          (s.properties.name ?? '').toLowerCase().includes(q)
      );
    }
    if (searchFilter.fuelTypes && searchFilter.fuelTypes.length > 0) {
      result = result.filter((s) => {
        const fuels = s.properties.fuels ?? {};
        return searchFilter.fuelTypes!.some((key) => key in fuels);
      });
    }
    return result;
  }, [stations, searchFilter]);

  const stationValue = useMemo<StationState>(
    () => ({
      stations,
      allStations,
      stationDistances,
      loading,
      error,
      offline,
      syncProgress,
      filteredStations,
      reload: load,
    }),
    [stations, allStations, stationDistances, loading, error, offline, syncProgress, filteredStations, load]
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
    }),
    [selectedStation, searchFilter, favorites, toggleFavorite, handleSetSearchFilter]
  );

  const actionsValue = useMemo<Actions>(
    () => ({
      loadStationsForRegion,
    }),
    [loadStationsForRegion]
  );

  return (
    <StationContext.Provider value={stationValue}>
      <LocationContext.Provider value={locationValue}>
        <UIContext.Provider value={uiValue}>
          <ActionsContext.Provider value={actionsValue}>
            {children}
          </ActionsContext.Provider>
        </UIContext.Provider>
      </LocationContext.Provider>
    </StationContext.Provider>
  );
}

export function useStations(): StationState {
  const ctx = useContext(StationContext);
  if (!ctx) throw new Error('useStations must be used within AppProvider');
  return ctx;
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