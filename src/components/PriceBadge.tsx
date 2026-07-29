import { memo, useMemo } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { fuelLabel } from '../utils/fuelNames';
import { tokens } from '../theme';

interface PriceBadgeProps {
  fuel: string;
  price: number;
}

function PriceBadgeComponent({ fuel, price }: PriceBadgeProps) {
  const colorScheme = useColorScheme();
  const colors = tokenColors[colorScheme === 'dark' ? 'dark' : 'light'];
  const typography = tokens.typography;
  const radius = tokens.radius;

  const priceCategory = useMemo(() => {
    if (price < 1.50) return { color: colors.priceLow, icon: '●' };
    if (price < 1.80) return { color: colors.priceMid, icon: '●' };
    return { color: colors.priceHigh, icon: '●' };
  }, [price, colors]);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.sm,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: typography.footnote.size, fontWeight: typography.footnote.weight, color: colors.secondaryLabel }}>
        {fuelLabel(fuel)}
      </Text>
      <Text style={{ fontSize: typography.subheadline.size, fontWeight: typography.subheadline.weight, color: priceCategory.color, fontFamily: 'System' }}>
        {price.toFixed(3)} {priceCategory.icon}
      </Text>
    </View>
  );
}

const tokenColors = {
  light: tokens.color.light,
  dark: tokens.color.dark,
};

export const PriceBadge = memo(PriceBadgeComponent);