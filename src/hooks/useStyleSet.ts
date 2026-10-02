import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_STYLE_SET, STYLE_SETS, normalizeStyleSet } from '../theme/styles';
import type { StyleSetId, StyleRules } from '../theme/styles';

const STORAGE_KEY = 'siphon:styleset';

export function useStyleSet() {
  const [styleSetId, setStyleSetIdState] = useState<StyleSetId>(DEFAULT_STYLE_SET);
  const [loaded, setLoaded] = useState(false);
  const selectionVersionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const hydrationVersion = selectionVersionRef.current;

    void AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!cancelled && selectionVersionRef.current === hydrationVersion) {
          setStyleSetIdState(normalizeStyleSet(value));
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

  const setStyleSetId = useCallback((id: StyleSetId) => {
    selectionVersionRef.current += 1;
    setStyleSetIdState(id);
    void AsyncStorage.setItem(STORAGE_KEY, id).catch(() => undefined);
  }, []);

  const rules: StyleRules = useMemo(
    () => STYLE_SETS[styleSetId] ?? STYLE_SETS[DEFAULT_STYLE_SET],
    [styleSetId],
  );

  return { styleSetId, setStyleSetId, rules, loaded };
}
