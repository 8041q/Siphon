import type { ReactNode } from 'react';
import { TouchableOpacity } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useAppearanceSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../../hooks/useStyleConfig';
import { GlassBackdrop } from './glass';

type ChipProps = {
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
  multiSelect?: boolean;
  transparent?: boolean;
};

/**
 * Toggleable solid chip. When unselected and the active style set marks `chip`
 * as glass, it renders a blur backdrop instead of the solid surface color;
 * selected chips stay solid tint so the active/disabled state reads clearly.
 */
export function Chip({ selected, onPress, children, className = '', disabled, compact = false, accessibilityLabel, multiSelect = false, transparent = false }: ChipProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useAppearanceSupport();
  const rules = useStyleConfig(styleRules, 'chip');
  const glass = isGlass(rules);
  const glassActive = glass && !selected;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={multiSelect ? 'checkbox' : 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled: Boolean(disabled), ...(multiSelect ? { checked: selected } : {}) }}
      hitSlop={compact ? { top: 2, bottom: 2 } : undefined}
      style={[
        { backgroundColor: selected ? colors.tint : glassActive || transparent ? 'transparent' : compact ? colors.groupedBackground : colors.surface },
        applyComponentRules(rules, colors.label),
        compact && {
          minHeight: 28,
          maxWidth: '100%',
          flexShrink: 1,
          alignSelf: 'flex-start',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 6,
          ...(disabled ? { opacity: 0.4 } : {}),
        },
      ]}
      className={className}
    >
      {glassActive && <GlassBackdrop color={colors.surface} borderRadius={compact ? 6 : rules.borderRadius} />}
      {children}
    </TouchableOpacity>
  );
}
