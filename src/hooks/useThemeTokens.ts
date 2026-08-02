import { useMemo } from 'react';
import { useColorScheme } from 'nativewind';

import { useSupport } from './useSupport';
import type { ColorSlot } from '../theme/types';

/**
 * Return resolved `ui` and `station` color values for the current
 * palette + color scheme.  Unlike `tokens.color[scheme]`, this
 * respects the active palette (not just the default).
 */
export function useThemeTokens() {
  const { palette } = useSupport();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const colors = useMemo(() => palette[scheme], [palette, scheme]);

  function get(key: ColorSlot): string {
    return colors[key];
  }

  return { colors, get, scheme };
}