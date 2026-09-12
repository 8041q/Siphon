import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useAppearanceSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../../hooks/useStyleConfig';
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

  return (
    <View
      style={[
        { backgroundColor: glass ? 'transparent' : color ?? colors.surface },
        applyComponentRules(rules, colors.label),
        style,
      ]}
      className={className}
    >
      {glass && <GlassBackdrop color={color ?? colors.surface} />}
      {children}
    </View>
  );
}
