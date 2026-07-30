import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';
import { tokens } from '../theme/tokens';

interface PriceBadgeProps {
  fuel: string;
  price: number;
  source?: string;
}

function PriceBadgeComponent({ fuel, price, source }: PriceBadgeProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = tokens.color[isDark ? 'dark' : 'light'];

  const priceColorClass = useMemo(() => {
    if (price < 1.50) return 'text-price-low dark:text-price-low-dark';
    if (price < 1.80) return 'text-price-mid dark:text-price-mid-dark';
    return 'text-price-high dark:text-price-high-dark';
  }, [price]);

  return (
    <View className="bg-surface dark:bg-surface-dark rounded-sm px-3 py-1.5 gap-1">
      <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
        {fuelLabel(fuel)}
      </Text>
      <Text className={`text-subheadline font-normal ${priceColorClass}`}>
        {price.toFixed(3)} {fuelUnit(fuel, source)}
      </Text>
    </View>
  );
}

export const PriceBadge = memo(PriceBadgeComponent);