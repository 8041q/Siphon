import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

const STORAGE_KEY = 'siphon:userLocationMarker';

export type UserLocationMarkerConfig =
  | { type: 'svg'; value: string }
  | { type: 'image'; value: string };

export const DEFAULT_MARKER: UserLocationMarkerConfig = {
  type: 'svg',
  value: 'location',
};

export const AVAILABLE_MARKERS = [
  'location',
  'crown',
  'oil',
  'park',
  'fire',
  'fuel',
  'brake',
] as const;

type AvailableMarker = (typeof AVAILABLE_MARKERS)[number];

const MARKER_IMAGES_DIR = new Directory(Paths.document, 'siphon', 'markerImages');

function isSvgMarker(value: unknown): value is AvailableMarker {
  return typeof value === 'string' && (AVAILABLE_MARKERS as readonly string[]).includes(value);
}

function isMarkerImageUri(uri: string): boolean {
  try {
    const normalizedDir = MARKER_IMAGES_DIR.uri.endsWith('/')
      ? MARKER_IMAGES_DIR.uri
      : `${MARKER_IMAGES_DIR.uri}/`;
    return new File(uri).uri.startsWith(normalizedDir);
  } catch {
    return false;
  }
}

function clearStaleMarkerImages(keepUri?: string): void {
  try {
    if (!MARKER_IMAGES_DIR.exists) return;
    for (const item of MARKER_IMAGES_DIR.list()) {
      if (
        item instanceof File &&
        item.name.startsWith('userMarker') &&
        (!keepUri || item.uri !== keepUri)
      ) {
        item.delete();
      }
    }
  } catch {
    // Stale-image cleanup is best effort and must never break marker selection.
  }
}

export async function saveMarkerImage(assetUri: string): Promise<string | null> {
  try {
    MARKER_IMAGES_DIR.create({ intermediates: true, idempotent: true });
    const source = new File(assetUri);
    const extension = source.extension || '.jpg';
    const dest = new File(
      MARKER_IMAGES_DIR,
      `userMarker-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`,
    );

    // Copy first. The current marker image remains intact if the import fails.
    await source.copy(dest);
    return dest.uri;
  } catch {
    return null;
  }
}

function parseStoredMarker(value: string): UserLocationMarkerConfig | null {
  try {
    const parsed = JSON.parse(value) as { type?: unknown; value?: unknown };
    if (parsed.type === 'svg' && isSvgMarker(parsed.value)) {
      return { type: 'svg', value: parsed.value };
    }
    if (parsed.type === 'image' && typeof parsed.value === 'string' && isMarkerImageUri(parsed.value)) {
      const image = new File(parsed.value);
      return image.exists ? { type: 'image', value: parsed.value } : null;
    }
  } catch {
    // Invalid persisted configuration falls back to the default marker.
  }
  return null;
}

export function useUserLocationMarker() {
  const [marker, setMarkerState] = useState<UserLocationMarkerConfig>(DEFAULT_MARKER);
  const [loaded, setLoaded] = useState(false);
  const selectionVersionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const hydrationVersion = selectionVersionRef.current;

    void AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (cancelled || selectionVersionRef.current !== hydrationVersion || !value) return;
        const parsed = parseStoredMarker(value);
        if (parsed) {
          setMarkerState(parsed);
          if (parsed.type === 'image') clearStaleMarkerImages(parsed.value);
        } else {
          void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
          clearStaleMarkerImages();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setMarker = useCallback((config: UserLocationMarkerConfig) => {
    if (config.type === 'svg' && !isSvgMarker(config.value)) return;
    if (config.type === 'image' && !isMarkerImageUri(config.value)) return;

    selectionVersionRef.current += 1;
    setMarkerState(config);

    // Keep the previously persisted image until the new configuration is
    // durably written. If storage fails, the old persisted marker remains
    // restart-safe instead of pointing at a file we already deleted.
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      .then(() => {
        clearStaleMarkerImages(config.type === 'image' ? config.value : undefined);
      })
      .catch(() => undefined);
  }, []);

  return { marker, setMarker, loaded, availableMarkers: AVAILABLE_MARKERS };
}
