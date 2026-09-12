import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vars } from 'nativewind';

import { PALETTES, PALETTE_ORDER, getPalette } from '../theme/palettes';
import type { Palette, PaletteId } from '../theme/palettes';
import { paletteToVariables } from '../theme/variables';

const STORAGE_KEY = 'siphon:palette';

function isPaletteId(value: string | null): value is PaletteId {
  return value != null && Object.prototype.hasOwnProperty.call(PALETTES, value);
}

export function usePalette() {
  const [paletteId, setPaletteIdState] = useState<PaletteId>('default');
  const [loaded, setLoaded] = useState(false);
  const selectionVersionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const hydrationVersion = selectionVersionRef.current;

    void AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!cancelled && selectionVersionRef.current === hydrationVersion && isPaletteId(value)) setPaletteIdState(value);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setPaletteId = useCallback((id: PaletteId) => {
    selectionVersionRef.current += 1;
    setPaletteIdState(id);
    void AsyncStorage.setItem(STORAGE_KEY, id).catch(() => undefined);
  }, []);

  const palette: Palette = useMemo(() => getPalette(paletteId), [paletteId]);
  const variables = useMemo(() => vars(paletteToVariables(palette)), [palette]);

  return { paletteId, setPaletteId, palette, variables, loaded, paletteOrder: PALETTE_ORDER };
}
