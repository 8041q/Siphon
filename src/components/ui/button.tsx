import type { ReactNode } from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules } from '../../hooks/useStyleConfig';

type ButtonProps = {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  className = '',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'button');
  const labelColor = variant === 'primary' ? colors.labelOnTint : colors.tint;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[{ minHeight: 44, backgroundColor: variant === 'primary' ? colors.tint : 'transparent' }, applyComponentRules(rules, colors.separator)]}
      className={`rounded-md py-md px-lg items-center justify-center ${className} ${disabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : typeof children === 'string' ? (
        <Text style={{ color: labelColor }} className="font-semibold text-callout">{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
