import type { ReactNode } from 'react';
import { TouchableOpacity } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../../hooks/useStyleConfig';
import { GlassBackdrop } from './glass';

type ChipProps = {
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

/**
 * Toggleable solid chip. When unselected and the active style set marks `chip`
 * as glass, it renders a blur backdrop instead of the solid surface color;
 * selected chips stay solid tint so the active/disabled state reads clearly.
 */
export function Chip({ selected, onPress, children, className = '', disabled }: ChipProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'chip');
  const glass = isGlass(rules);
  const glassActive = glass && !selected;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[
        { backgroundColor: selected ? colors.tint : glassActive ? 'transparent' : colors.surface },
        applyComponentRules(rules, colors.label),
      ]}
      className={className}
    >
      {glassActive && <GlassBackdrop color={colors.surface} />}
      {children}
    </TouchableOpacity>
  );
}