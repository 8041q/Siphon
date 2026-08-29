import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../../hooks/useStyleConfig';
import { GlassBackdrop } from './glass';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'card');
  const glass = isGlass(rules);

  return (
    <View
      style={[{ backgroundColor: glass ? 'transparent' : colors.groupedBackground }, applyComponentRules(rules, colors.label)]}
      className={`rounded-md p-md ${className}`}
    >
      {glass && <GlassBackdrop color={colors.groupedBackground} />}
      {children}
    </View>
  );
}