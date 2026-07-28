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
}

interface UIState {
  selectedStation: FuelStationFeature | null;
  searchFilter: SearchFilter;
  setSelectedStation: (s: FuelStationFeature | null) => void;
  setSearchFilter: (f: SearchFilter) => void;
}

interface Actions {
  loadStationsForRegion: (lat: number, lng: number) => Promise<void>;
}

const StationContext = createContext<StationState | null>(null);
const LocationContext = createContext<LocationState | null>(null);
const UIContext = createContext<UIState | null>(null);
const ActionsContext = createContext<Actions | null>(null);

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
  const changedCountriesRef = useRef<import('../api/siphonClient').CountryCode[]>([]);
  const regionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const cached = await client.getStationsNear(
        location.latitude,
        location.longitude
      );
      if (cached.length > 0) {
        setStations(cached);
        setLoading(false);
        setSyncProgress(null);
      }

      setSyncProgress('Syncing latest data…');
      await client.syncAll(result.changedCountries, (loaded, total) => {
        if (total > 0 && result.changedCountries.length > 0) {
          setSyncProgress(`Syncing ${loaded}/${total}…`);
        }
      });

      await client.recordDailySnapshot();

      const nearby = await client.getStationsNear(
        location.latitude,
        location.longitude,
        result.changedCountries
      );
      setStations(nearby);

      if (cached.length === 0 && result.offline && nearby.length === 0) {
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

  const loadStationsForRegion = useCallback(async (lat: number, lng: number) => {
    if (regionTimerRef.current) clearTimeout(regionTimerRef.current);
    regionTimerRef.current = setTimeout(async () => {
      try {
        const nearby = await client.getStationsNear(lat, lng, changedCountriesRef.current);
        setStations(nearby);
      } catch {}
    }, 800);
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
    }),
    [location, requestingLocation, refreshLocation]
  );

  const uiValue = useMemo<UIState>(
    () => ({
      selectedStation,
      searchFilter,
      setSelectedStation,
      setSearchFilter,
    }),
    [selectedStation, searchFilter]
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