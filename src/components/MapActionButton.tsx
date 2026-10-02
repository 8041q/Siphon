import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { GlassSurface } from './ui/glass';
import { Icon } from './ui/icon';

export function MapActionButton({
  iconName,
  label,
  onPress,
  badgeCount = 0,
  busy = false,
}: {
  iconName: string;
  label: string;
  onPress: () => void;
  badgeCount?: number;
  busy?: boolean;
}) {
  const { colors } = useThemeTokens();
  return (
    <GlassSurface color={colors.surface} style={{ borderRadius: 22 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: badgeCount > 0, disabled: busy, busy }}
        hitSlop={4}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        {busy ? <ActivityIndicator size="small" color={colors.tint} /> : (
          <View className="relative">
            <Icon name={iconName} size={20} color={colors.tint} />
            {badgeCount > 0 && (
              <View style={{
                position: 'absolute', top: -6, end: -6,
                backgroundColor: colors.tint, borderRadius: 9999,
                minWidth: 16, height: 16, paddingHorizontal: 4,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text className="text-[10px] font-bold" style={{ color: colors.labelOnTint }}>{badgeCount}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </GlassSurface>
  );
}
