import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface LocationState {
  latitude: number;
  longitude: number;
  approximate: boolean;
}

const DEFAULT_COORDS = { latitude: 37.5, longitude: -8.0 };
const LOCATION_KEY = 'siphon:lastLocation';

function hasValidCoordinates(
  value: { latitude?: unknown; longitude?: unknown },
): value is { latitude: number; longitude: number } {
  return (
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.latitude) <= 90 &&
    Math.abs(value.longitude) <= 180
  );
}

async function fetchGpsLocation(): Promise<LocationState | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'android' ? Location.Accuracy.Low : Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: false,
    });

    if (!hasValidCoordinates(loc.coords)) return null;
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      approximate: false,
    };
  } catch {
    return null;
  }
}

export function useLocation() {
  const [loc, setLoc] = useState<LocationState>({
    ...DEFAULT_COORDS,
    approximate: true,
  });
  const [requesting, setRequesting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const mountedRef = useRef(false);
  const hydratedRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const gpsRequestRef = useRef<Promise<{ latitude: number; longitude: number } | null> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback((): Promise<void> => {
    if (hydratedRef.current) return Promise.resolve();
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const request = (async () => {
      if (mountedRef.current) setRequesting(true);
      try {
        const saved = await AsyncStorage.getItem(LOCATION_KEY).catch(() => null);
        if (!mountedRef.current) return;

        if (saved) {
          try {
            const parsed = JSON.parse(saved) as { latitude?: unknown; longitude?: unknown };
            if (hasValidCoordinates(parsed)) {
              setLoc({ latitude: parsed.latitude, longitude: parsed.longitude, approximate: true });
            }
          } catch {
            // Ignore corrupt cached coordinates.
          }
        }
      } finally {
        if (mountedRef.current) {
          hydratedRef.current = true;
          setRequesting(false);
          setHydrated(true);
        }
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = request;
    return request;
  }, []);

  const locateWithGps = useCallback((): Promise<{ latitude: number; longitude: number } | null> => {
    if (gpsRequestRef.current) return gpsRequestRef.current;

    const request = (async () => {
      // Finish cached-location hydration first so a slow AsyncStorage read can
      // never overwrite a newer GPS fix, and so `requesting` cannot flicker
      // false while the GPS request is still in flight.
      await refresh();
      if (!mountedRef.current) return null;

      setRequesting(true);
      try {
        const gps = await fetchGpsLocation();
        if (!gps || !mountedRef.current) return null;

        setLoc(gps);
        void AsyncStorage.setItem(
          LOCATION_KEY,
          JSON.stringify({ latitude: gps.latitude, longitude: gps.longitude }),
        ).catch(() => undefined);
        return { latitude: gps.latitude, longitude: gps.longitude };
      } finally {
        if (mountedRef.current) setRequesting(false);
        gpsRequestRef.current = null;
      }
    })();

    gpsRequestRef.current = request;
    return request;
  }, [refresh]);

  return { location: loc, requesting, hydrated, refresh, locateWithGps };
}
