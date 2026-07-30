import { Text, View } from 'react-native';

type BadgeProps = {
  label: string;
  value: string;
  color?: string;
};

export function Badge({ label, value, color }: BadgeProps) {
  return (
    <View className="bg-surface rounded-sm px-3 py-1.5 gap-1">
      <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{label}</Text>
      <Text className="text-subheadline" style={color ? { color } : undefined}>
        {value}
      </Text>
    </View>
  );
}
