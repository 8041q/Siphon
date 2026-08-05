import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../../hooks/useStyleConfig';
import type { StyleRules } from '../../theme/styles';
import { GlassBackdrop } from './glass';

type GlassBoxProps = {
  component: keyof StyleRules;
  children: ReactNode;
  color?: string;
  className?: string;
  style?: any;
};

/**
 * Glass-aware plain surface: solid `color` by default, blur backdrop when the
 * active style set marks `component` as glass. Use for raw Views (cards, input
 * wrappers, icon circles) that don't map to an existing UI component.
 */
export function GlassBox({ component, children, color, className = '', style }: GlassBoxProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, component);
  const glass = isGlass(rules);

  return (
    <View
      style={[{ backgroundColor: glass ? 'transparent' : color ?? colors.surface }, applyComponentRules(rules), style]}
      className={className}
    >
      {glass && <GlassBackdrop color={color ?? colors.surface} />}
      {children}
    </View>
  );
}