import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { FuelDataClient, FuelStationFeature } from '../api/siphonClient';
import { hybridStore } from '../store/hybridStore';
import { useLocation } from './useLocation';
import * as Haptics from 'expo-haptics';
import type { FC } from 'react';

interface StationState {
  stations: FuelStationFeature[];
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

type SearchFilter = {
  brand?: string;
  fuelType?: string;
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { location, requesting: requestingLocation, refresh: refreshLocation, locateWithGps } = useLocation();
  const [stations, setStations] = useState<FuelStationFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<FuelStationFeature | null>(null);
  const [searchFilter, setSearchFilter] = useState<{ brand?: string; fuelType?: string }>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const started = useRef(false);
  const changedCountriesRef = useRef<import('../api/siphonClient').CountryCode[]>([]);
  const regionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!started.current) {
      started.current = true;
      refreshLocation();
    }
  }, [refreshLocation]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOffline(false);
    setSyncProgress(null);

    try {
      setSyncProgress('Checking for updates…');
      const result = await client.checkForUpdates();
      setOffline(result.offline);
      changedCountriesRef.current = result.changedCountries;

      setSyncProgress('Syncing latest data…');
      await client.syncAll(result.changedCountries, (loaded, total) => {
        if (total > 0 && result.changedCountries.length > 0) {
          setSyncProgress(`Syncing ${loaded}/${total}…`);
        }
      });

      await client.recordDailySnapshot();

      if (result.offline) {
        setError('No internet connection. Connect to download station data on first use.');
      }
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
      setSyncProgress(null);
    }
  }, [location.latitude, location.longitude]);

  useEffect(() => {
    if (started.current && !requestingLocation) {
      load();
    }
  }, [requestingLocation, load]);

  const loadStationsForRegion = useCallback(async (lat: number, lng: number, bounds?: [number, number, number, number]) => {
    if (regionTimerRef.current) clearTimeout(regionTimerRef.current);
    regionTimerRef.current = setTimeout(async () => {
      try {
        const nearby = await client.getStationsNear(lat, lng, changedCountriesRef.current, bounds);
        setStations(nearby);
      } catch {}
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
    if (searchFilter.fuelType) {
      result = result.filter((s) => searchFilter.fuelType! in (s.properties.fuels ?? {}));
    }
    return result;
  }, [stations, searchFilter]);

  const stationValue = useMemo<StationState>(
    () => ({
      stations,
      loading,
      error,
      offline,
      syncProgress,
      filteredStations,
      reload: load,
    }),
    [stations, loading, error, offline, syncProgress, filteredStations, load]
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
      setSearchFilter,
      favorites,
      toggleFavorite,
    }),
    [selectedStation, searchFilter, favorites, toggleFavorite]
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