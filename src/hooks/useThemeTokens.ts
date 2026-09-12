import { useCallback, useMemo } from 'react';
import { useColorScheme } from 'nativewind';

import { useAppearanceSupport } from './useSupport';
import type { ColorSlot } from '../theme/types';

/**
 * Return resolved UI/station colors for the active palette + color scheme.
 * This intentionally subscribes only to appearance state, not rewards/ad state.
 */
export function useThemeTokens() {
  const { palette } = useAppearanceSupport();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const colors = useMemo(() => palette[scheme], [palette, scheme]);
  const get = useCallback((key: ColorSlot): string => colors[key], [colors]);

  return useMemo(() => ({ colors, get, scheme }), [colors, get, scheme]);
}
