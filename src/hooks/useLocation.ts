import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export interface LocationState {
  latitude: number;
  longitude: number;
  approximate: boolean;
}

const DEFAULT_COORDS = { latitude: 40.4168, longitude: -3.7038 };

export function useLocation() {
  const [loc, setLoc] = useState<LocationState>({
    ...DEFAULT_COORDS,
    approximate: true,
  });
  const [requesting, setRequesting] = useState(false);

  const refresh = useCallback(async () => {
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          });
          setLoc({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            approximate: false,
          });
          return;
        } catch {
          try {
            const last = await Location.getLastKnownPositionAsync();
            if (last) {
              setLoc({
                latitude: last.coords.latitude,
                longitude: last.coords.longitude,
                approximate: true,
              });
              return;
            }
          } catch {}
        }
      }
      setLoc({ ...DEFAULT_COORDS, approximate: true });
    } catch {
      setLoc({ ...DEFAULT_COORDS, approximate: true });
    } finally {
      setRequesting(false);
    }
  }, []);

  return { location: loc, requesting, refresh };
}
