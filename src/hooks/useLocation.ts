import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface LocationState {
  latitude: number;
  longitude: number;
  approximate: boolean;
}

const DEFAULT_COORDS = { latitude: 37.5, longitude: -8.0 };
const LOCATION_KEY = 'siphon:lastLocation';
const PERMISSION_KEY = 'siphon:location:permissionGranted';

async function fetchGpsLocation(): Promise<LocationState | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    await AsyncStorage.setItem(PERMISSION_KEY, 'true');
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'android' ? Location.Accuracy.Low : Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: false,
    });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude, approximate: false };
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
