import { Text, View } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../../hooks/useStyleConfig';
import { GlassBackdrop } from './glass';

type BadgeProps = {
  label: string;
  value: string;
  color?: string;
};

export function Badge({ label, value, color }: BadgeProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'badge');
  const glass = isGlass(rules);

  return (
    <View
      style={[{ backgroundColor: glass ? 'transparent' : colors.surface }, applyComponentRules(rules, colors.label)]}
      className="rounded-sm px-3 py-1.5 gap-1"
    >
      {glass && <GlassBackdrop color={colors.surface} />}
      <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{label}</Text>
      <Text className="text-subheadline" style={color ? { color } : undefined}>
        {value}
      </Text>
    </View>
  );
}
