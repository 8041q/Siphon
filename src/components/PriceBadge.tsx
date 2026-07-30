import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';

interface PriceBadgeProps {
  fuel: string;
  price: number;
  source?: string;
}

function PriceBadgeComponent({ fuel, price, source }: PriceBadgeProps) {

  const priceColorClass = useMemo(() => {
    if (price < 1.65) return 'text-price-low dark:text-price-low-dark';
    if (price < 1.87) return 'text-price-mid dark:text-price-mid-dark';
    return 'text-price-high dark:text-price-high-dark';
  }, [price]);

  return (
    <View className="bg-surface dark:bg-surface-dark rounded-sm px-3 py-2 gap-0.5 min-w-[110px]">
      <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">
        {fuelLabel(fuel)}
      </Text>
      <Text className={`text-headline font-semibold ${priceColorClass}`}>
        {price.toFixed(3)} {fuelUnit(fuel, source)}
      </Text>
    </View>
  );
}

export const PriceBadge = memo(PriceBadgeComponent);