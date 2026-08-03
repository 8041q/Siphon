import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STYLE_SETS } from '../theme/styles';
import type { StyleSetId, StyleRules } from '../theme/styles';

const STORAGE_KEY = 'siphon:styleset';

export function useStyleSet() {
  const [styleSetId, setStyleSetIdState] = useState<StyleSetId>('default');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val && val in STYLE_SETS) {
        setStyleSetIdState(val as StyleSetId);
      }
      setLoaded(true);
    });
  }, []);

  const setStyleSetId = useCallback((id: StyleSetId) => {
    setStyleSetIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const rules: StyleRules = useMemo(() => STYLE_SETS[styleSetId] ?? STYLE_SETS.default, [styleSetId]);

  return { styleSetId, setStyleSetId, rules, loaded };
}