import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';

export interface LocationState {
  latitude: number;
  longitude: number;
  approximate: boolean;
}

const DEFAULT_COORDS = { latitude: 39.5, longitude: -8.0 };
const LOCATION_KEY = 'siphon:lastLocation';

async function fetchIpLocation(): Promise<LocationState | null> {
  try {
    const res = await fetch('http://ip-api.com/json/', { signal: AbortSignal.timeout(5000) });
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

  return { location: loc, requesting, refresh };
}
