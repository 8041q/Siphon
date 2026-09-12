import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ICON_SETS } from '../theme/icons';
import type { IconSetId, IconSetDef } from '../theme/icons';

const STORAGE_KEY = 'siphon:iconset';

function isIconSetId(value: string | null): value is IconSetId {
  return value != null && Object.prototype.hasOwnProperty.call(ICON_SETS, value);
}

export function useIconSet() {
  const [iconSetId, setIconSetIdState] = useState<IconSetId>('ionicons');
  const [loaded, setLoaded] = useState(false);
  const selectionVersionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const hydrationVersion = selectionVersionRef.current;

    void AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!cancelled && selectionVersionRef.current === hydrationVersion && isIconSetId(value)) setIconSetIdState(value);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setIconSetId = useCallback((id: IconSetId) => {
    selectionVersionRef.current += 1;
    setIconSetIdState(id);
    void AsyncStorage.setItem(STORAGE_KEY, id).catch(() => undefined);
  }, []);

  const iconSet: IconSetDef = useMemo(
    () => ICON_SETS[iconSetId] ?? ICON_SETS.ionicons,
    [iconSetId],
  );

  return { iconSetId, setIconSetId, iconSet, loaded };
}
