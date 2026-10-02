import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useAppearanceSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass, componentSurface } from '../../hooks/useStyleConfig';
import type { StyleRules } from '../../theme/styles';
import { GlassBackdrop } from './glass';

type GlassBoxProps = {
  component: keyof StyleRules;
  children: ReactNode;
  color?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** Glass-aware plain surface used by raw View-based components. */
export function GlassBox({ component, children, color, className = '', style }: GlassBoxProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useAppearanceSupport();
  const rules = useStyleConfig(styleRules, component);
  const glass = isGlass(rules);
  const borderRadius = StyleSheet.flatten(style)?.borderRadius ?? rules.borderRadius;

  return (
    <View
      style={[
        { backgroundColor: glass ? 'transparent' : color ?? componentSurface(rules, colors, 'surface') },
        applyComponentRules(rules, colors.separator),
        style,
        glass && Platform.OS === 'android' && { overflow: 'visible' },
      ]}
      className={className}
    >
      {glass && <GlassBackdrop color={color ?? colors.surface} borderRadius={borderRadius} />}
      {children}
    </View>
  );
}
