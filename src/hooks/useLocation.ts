import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';
import * as Location from 'expo-location';

export interface LocationState {
  latitude: number;
  longitude: number;
  approximate: boolean;
}

const DEFAULT_COORDS = { latitude: 39.5, longitude: -8.0 };
const LOCATION_KEY = 'siphon:lastLocation';

async function fetchGpsLocation(): Promise<LocationState | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude, approximate: false };
  } catch {
    return null;
  }
}

async function fetchIpLocation(): Promise<LocationState | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://ip-api.com/json/', { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'success' && typeof data.lat === 'number' && typeof data.lon === 'number') {
      return { latitude: data.lat, longitude: data.lon, approximate: true };
    }
    return null;
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
  const started = useRef(false);

  const refresh = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    setRequesting(true);
    try {
      const ip = await fetchIpLocation();
      if (ip) {
        setLoc(ip);
        await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ latitude: ip.latitude, longitude: ip.longitude }));
        return;
      }

      const saved = await AsyncStorage.getItem(LOCATION_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
            setLoc({ latitude: parsed.latitude, longitude: parsed.longitude, approximate: true });
          }
        } catch {}
      }
    } finally {
      setRequesting(false);
    }
  }, []);

  const locateWithGps = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    setRequesting(true);
    try {
      const gps = await fetchGpsLocation();
      if (gps) {
        setLoc(gps);
        await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ latitude: gps.latitude, longitude: gps.longitude }));
        return { latitude: gps.latitude, longitude: gps.longitude };
      }
      return null;
    } finally {
      setRequesting(false);
    }
  }, []);

  return { location: loc, requesting, refresh, locateWithGps };
}
