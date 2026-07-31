import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'siphon:userLocationMarker';

export type UserLocationMarkerConfig =
  | { type: 'icon'; value: string }
  | { type: 'svg'; value: string }
  | { type: 'image'; value: string };

export const DEFAULT_MARKER: UserLocationMarkerConfig = {
  type: 'icon',
  value: 'my_location',
};

export const AVAILABLE_ICONS = [
  'my_location',
  'navigate_circle',
  'compass',
  'location_pin',
] as const;

export function useUserLocationMarker() {
  const [marker, setMarkerState] = useState<UserLocationMarkerConfig>(DEFAULT_MARKER);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val) as UserLocationMarkerConfig;
          if (parsed.type === 'icon' || parsed.type === 'svg' || parsed.type === 'image') {
            setMarkerState(parsed);
          }
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const setMarker = useCallback((config: UserLocationMarkerConfig) => {
    setMarkerState(config);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, []);

  return { marker, setMarker, loaded, availableIcons: AVAILABLE_ICONS };
}
