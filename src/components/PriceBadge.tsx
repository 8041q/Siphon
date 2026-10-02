import { memo } from 'react';
import { Text, View } from 'react-native';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useAppearanceSupport } from '../hooks/useSupport';
import { useAppearanceLayout } from '../hooks/useAppearanceLayout';
import { useTranslation } from 'react-i18next';
import { useStyleConfig, applyComponentRules, isGlass } from '../hooks/useStyleConfig';
import { GlassBackdrop } from './ui/glass';
import { usePriceBenchmarks } from '../hooks/useApp';
import { priceLevel, priceLevelColor } from '../utils/priceColors';

interface PriceBadgeProps {
  fuel: string;
  price: number;
  source?: string;
  prominent?: boolean;
}

function PriceBadgeComponent({ fuel, price, source, prominent = false }: PriceBadgeProps) {
  const { colors, scheme } = useThemeTokens();
  const { styleRules } = useAppearanceSupport();
  const { t } = useTranslation();
  const { modern, compact, numericStyle } = useAppearanceLayout();
  const rules = useStyleConfig(styleRules, 'chip');
  const glass = isGlass(rules);

  const benchmarks = usePriceBenchmarks();
  const level = priceLevel(price, fuel, source, benchmarks);
  const priceColor = priceLevelColor(level, colors, scheme);

  if (modern) return (
    <View style={{ minWidth: prominent ? 130 : 84, flexBasis: prominent ? undefined : 84, flexShrink: 1, flexGrow: prominent ? 0 : 1, justifyContent: prominent ? undefined : 'space-between', paddingVertical: compact ? 3 : 5 }}>
      <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{fuelLabel(fuel)}</Text>
      <Text style={[numericStyle, { color: priceColor, fontSize: prominent ? (compact ? 28 : 32) : 17, fontWeight: '600' }]}>{price.toFixed(3)} <Text style={{ color: colors.secondaryLabel, fontSize: prominent ? 14 : 12 }}>{fuelUnit(fuel, source)}</Text></Text>
      {prominent && <Text style={{ color: priceColor, flexShrink: 1 }} className="text-footnote">{t(`station.reference_${level}`)}</Text>}
    </View>
  );

  return (
    <View
      style={[{ backgroundColor: glass ? 'transparent' : colors.surface }, applyComponentRules(rules, colors.separator)]}
      className="rounded-sm px-3 py-2 gap-0.5 min-w-[110px]"
    >
      {glass && <GlassBackdrop color={colors.surface} borderRadius={rules.borderRadius} />}
      <Text style={{ color: colors.secondaryLabel }} className="text-callout">
        {fuelLabel(fuel)}
      </Text>
      <Text style={[numericStyle, { color: priceColor }]} className="text-headline font-semibold">
        {price.toFixed(3)} {fuelUnit(fuel, source)}
      </Text>
    </View>
  );
}

export const PriceBadge = memo(PriceBadgeComponent);
