import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { FuelDataClient, FuelStationFeature } from '../api/siphonClient';
import { hybridStore } from '../store/hybridStore';
import { useLocation } from './useLocation';

export const client = new FuelDataClient({
  store: hybridStore,
  baseUrl: 'https://raw.githubusercontent.com/8041q/SiphonAPI/main',
});

export interface SearchFilter {
  brand?: string;
  fuelType?: string;
}

interface AppState {
  stations: FuelStationFeature[];
  loading: boolean;
  error: string | null;
  offline: boolean;
  syncProgress: string | null;
  location: ReturnType<typeof useLocation>['location'];
  requestingLocation: boolean;
  selectedStation: FuelStationFeature | null;
  searchFilter: SearchFilter;
  setSelectedStation: (s: FuelStationFeature | null) => void;
  setSearchFilter: (f: SearchFilter) => void;
  reload: () => void;
  refreshLocation: () => void;
  filteredStations: FuelStationFeature[];
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { location, requesting: requestingLocation, refresh: refreshLocation } = useLocation();
  const [stations, setStations] = useState<FuelStationFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<FuelStationFeature | null>(null);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>({});

  const started = useRef(false);

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

      setSyncProgress('Downloading stations data…');
      await client.syncAll(result.changedCountries, (loaded, total) => {
        if (total > 0 && result.changedCountries.length > 0) {
          setSyncProgress(`Downloading stations data ${loaded}/${total}…`);
        }
      });

      await client.recordDailySnapshot();

      setSyncProgress('Loading nearby stations…');
      const nearby = await client.getStationsNear(
        location.latitude,
        location.longitude,
        result.changedCountries
      );
      setStations(nearby);

      if (result.offline && nearby.length === 0) {
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

  const ctx = useMemo<AppState>(
    () => ({
      stations,
      loading,
      error,
      offline,
      syncProgress,
      location,
      requestingLocation,
      selectedStation,
      searchFilter,
      setSelectedStation,
      setSearchFilter,
      reload: load,
      refreshLocation,
      filteredStations,
    }),
    [
      stations, loading, error, offline, syncProgress,
      location, requestingLocation, selectedStation, searchFilter,
      load, refreshLocation, filteredStations,
    ]
  );

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
