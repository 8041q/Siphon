import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ICON_SETS } from '../theme/icons';
import type { IconSetId, IconSetDef } from '../theme/icons';

const STORAGE_KEY = 'siphon:iconset';

export function useIconSet() {
  const [iconSetId, setIconSetIdState] = useState<IconSetId>('ionicons');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val && val in ICON_SETS) {
        setIconSetIdState(val as IconSetId);
      }
      setLoaded(true);
    });
  }, []);

  const setIconSetId = useCallback((id: IconSetId) => {
    setIconSetIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const iconSet: IconSetDef = useMemo(() => ICON_SETS[iconSetId] ?? ICON_SETS.ionicons, [iconSetId]);

  return { iconSetId, setIconSetId, iconSet, loaded };
}