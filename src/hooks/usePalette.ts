import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vars } from 'nativewind';

import { PALETTES, PALETTE_ORDER, getPalette } from '../theme/palettes';
import type { Palette, PaletteId } from '../theme/palettes';
import { paletteToVariables } from '../theme/variables';

const STORAGE_KEY = 'siphon:palette';

export function usePalette() {
  const [paletteId, setPaletteIdState] = useState<PaletteId>('default');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val && val in PALETTES) {
        setPaletteIdState(val as PaletteId);
      }
      setLoaded(true);
    });
  }, []);

  const setPaletteId = useCallback((id: PaletteId) => {
    setPaletteIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const palette: Palette = useMemo(() => getPalette(paletteId), [paletteId]);

  const variables = useMemo(() => vars(paletteToVariables(palette)), [palette]);

  return { paletteId, setPaletteId, palette, variables, loaded, paletteOrder: PALETTE_ORDER };
}
