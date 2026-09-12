import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useAppearanceSupport } from '../../hooks/useSupport';
import { useStyleConfig, isGlass } from '../../hooks/useStyleConfig';
import { GlassBackdrop, useAppBlurTarget } from './glass';

type SheetBackgroundProps = {
  pointerEvents?: ViewProps['pointerEvents'];
};

/** Reusable background for @gorhom/bottom-sheet `backgroundComponent`. */
export function SheetBackground({ pointerEvents }: SheetBackgroundProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useAppearanceSupport();
  const rules = useStyleConfig(styleRules, 'sheet');
  const glass = isGlass(rules);
  const appBlurTarget = useAppBlurTarget();
  const radius = rules.borderRadius ?? 15;

  const base: StyleProp<ViewStyle> = [
    StyleSheet.absoluteFill,
    {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    glass
      ? { backgroundColor: 'transparent', overflow: 'hidden' }
      : { backgroundColor: colors.sheet },
  ];

  return (
    <View
      pointerEvents={pointerEvents ?? 'box-none'}
      accessible={false}
      importantForAccessibility="no"
      style={base}
    >
      {glass && <GlassBackdrop color={colors.sheet} blurTarget={appBlurTarget} />}
    </View>
  );
}
