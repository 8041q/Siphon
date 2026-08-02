import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';

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

const MARKER_IMAGES_DIR = new Directory(Paths.document, 'siphon', 'markerImages');

function isMarkerImageUri(uri: string): boolean {
  try {
    return new File(uri).uri.startsWith(MARKER_IMAGES_DIR.uri);
  } catch {
    return false;
  }
}

function clearStaleMarkerImages(): void {
  if (!MARKER_IMAGES_DIR.exists) return;
  for (const item of MARKER_IMAGES_DIR.list()) {
    if (item instanceof File && item.name.startsWith('userMarker')) {
      item.delete();
    }
  }
}

export async function saveMarkerImage(assetUri: string): Promise<string | null> {
  try {
    MARKER_IMAGES_DIR.create({ intermediates: true, idempotent: true });
    clearStaleMarkerImages();
    const source = new File(assetUri);
    const dest = new File(MARKER_IMAGES_DIR, `userMarker${source.extension || '.jpg'}`);
    await source.copy(dest);
    return dest.uri;
  } catch {
    return null;
  }
}

export function useUserLocationMarker() {
  const [marker, setMarkerState] = useState<UserLocationMarkerConfig>(DEFAULT_MARKER);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val) as UserLocationMarkerConfig;
          if (parsed.type === 'icon' || parsed.type === 'svg') {
            setMarkerState(parsed);
          } else if (parsed.type === 'image' && isMarkerImageUri(parsed.value)) {
            const image = new File(parsed.value);
            if (image.exists) {
              setMarkerState(parsed);
            } else {
              AsyncStorage.removeItem(STORAGE_KEY);
            }
          }
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const setMarker = useCallback((config: UserLocationMarkerConfig) => {
    if (config.type === 'image' && !isMarkerImageUri(config.value)) {
      return;
    }
    if (marker.type === 'image' && marker.value !== config.value) {
      clearStaleMarkerImages();
    }
    setMarkerState(config);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [marker]);

  return { marker, setMarker, loaded, availableIcons: AVAILABLE_ICONS };
}
