import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreIconPack, type CustomIconPack } from '../theme/customSvg';
const STORAGE_KEY = 'siphon:customIconPack';
export function useCustomIconPack() {
  const [customIconPack, setState] = useState<CustomIconPack | null>(null);
  const version = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const hydrationVersion = version.current;
    void AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (!cancelled && version.current === hydrationVersion && value) setState(restoreIconPack(value));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const setCustomIconPack = useCallback(async (pack: CustomIconPack) => {
    version.current++;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
    setState(pack);
  }, []);
  return { customIconPack, setCustomIconPack };
}
