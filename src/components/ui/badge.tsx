import { Text, View } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';

type BadgeProps = {
  label: string;
  value: string;
  color?: string;
};

export function Badge({ label, value, color }: BadgeProps) {
  const { colors } = useThemeTokens();

  return (
    <View style={{ backgroundColor: colors.surface }} className="rounded-sm px-3 py-1.5 gap-1">
      <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{label}</Text>
      <Text className="text-subheadline" style={color ? { color } : undefined}>
        {value}
      </Text>
    </View>
  );
}
