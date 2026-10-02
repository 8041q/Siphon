import type { TextStyle } from 'react-native';
import { useAppearanceSupport } from './useSupport';
import { DEFAULT_DENSITY, DENSITIES } from '../theme/density';
import { DEFAULT_STYLE_SET } from '../theme/styles';

export function useAppearanceLayout() {
  const { densityId = DEFAULT_DENSITY, styleSetId = DEFAULT_STYLE_SET } = useAppearanceSupport();
  const numericStyle: TextStyle = { fontVariant: ['tabular-nums'] };
  return {
    space: DENSITIES[densityId],
    compact: densityId === 'compact',
    modern: styleSetId !== 'default',
    numericStyle,
  };
}
