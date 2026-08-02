import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';
import { useThemeTokens } from '../hooks/useThemeTokens';

interface PriceBadgeProps {
  fuel: string;
  price: number;
  source?: string;
}

function PriceBadgeComponent({ fuel, price, source }: PriceBadgeProps) {
  const { colors } = useThemeTokens();

  const priceColor = useMemo(() => {
    if (price < 1.65) return colors.priceLow;
    if (price < 1.87) return colors.priceMid;
    return colors.priceHigh;
  }, [price, colors]);

  return (
    <View style={{ backgroundColor: colors.surface }} className="rounded-sm px-3 py-2 gap-0.5 min-w-[110px]">
      <Text style={{ color: colors.secondaryLabel }} className="text-callout">
        {fuelLabel(fuel)}
      </Text>
      <Text style={{ color: priceColor }} className="text-headline font-semibold">
        {price.toFixed(3)} {fuelUnit(fuel, source)}
      </Text>
    </View>
  );
}

export const PriceBadge = memo(PriceBadgeComponent);