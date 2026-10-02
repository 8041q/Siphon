import { memo } from 'react';
import { Text, View } from 'react-native';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useSupport } from '../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../hooks/useStyleConfig';
import { GlassBackdrop } from './ui/glass';
import { usePriceBenchmarks } from '../hooks/useApp';
import { priceLevel, priceLevelColor } from '../utils/priceColors';

interface PriceBadgeProps {
  fuel: string;
  price: number;
  source?: string;
}

function PriceBadgeComponent({ fuel, price, source }: PriceBadgeProps) {
  const { colors, scheme } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'chip');
  const glass = isGlass(rules);

  const benchmarks = usePriceBenchmarks();
  const priceColor = priceLevelColor(priceLevel(price, fuel, source, benchmarks), colors, scheme);

  return (
    <View
      style={[{ backgroundColor: glass ? 'transparent' : colors.surface }, applyComponentRules(rules, colors.label)]}
      className="rounded-sm px-3 py-2 gap-0.5 min-w-[110px]"
    >
      {glass && <GlassBackdrop color={colors.surface} borderRadius={rules.borderRadius} />}
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
