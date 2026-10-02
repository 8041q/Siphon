import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_DENSITY, normalizeDensity, type DensityId } from '../theme/density';

const STORAGE_KEY = 'siphon:density';

export function useDensity() {
  const [densityId, setState] = useState<DensityId>(DEFAULT_DENSITY);
  const version = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const hydrationVersion = version.current;
    void AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (!cancelled && version.current === hydrationVersion) setState(normalizeDensity(value));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const setDensityId = useCallback((id: DensityId) => {
    version.current += 1;
    setState(id);
    void AsyncStorage.setItem(STORAGE_KEY, id).catch(() => undefined);
  }, []);
  return { densityId, setDensityId };
}
