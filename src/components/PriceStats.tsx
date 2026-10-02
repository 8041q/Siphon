import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppearanceLayout } from '../hooks/useAppearanceLayout';
import { useThemeTokens } from '../hooks/useThemeTokens';
import type { PriceHistoryPoint } from '../api/siphonClient';
import { statsFor } from '../utils/priceAnalysis';
import { usePriceBenchmarks } from '../hooks/useApp';
import { priceLevel, priceLevelColor } from '../utils/priceColors';

interface PriceStatsProps {
  data: PriceHistoryPoint[];
  unit: string;
  fuel: string;
  source?: string;
  includeCurrent?: boolean;
}

function StatCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { colors } = useThemeTokens();
  const { numericStyle } = useAppearanceLayout();
  return (
    <View style={{ justifyContent: 'space-between' }} className="flex-1 basis-[30%] min-w-[88px]">
      <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{label}</Text>
      <Text style={[numericStyle, { color: valueColor ?? colors.label }]} className="text-title-3 font-bold mt-0.5">
        {value}
      </Text>
    </View>
  );
}

function ChangeCell({ label, pct }: { label: string; pct: number | null }) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  if (pct === null) return <StatCell label={label} value="-" />;
  const down = pct <= 0;
  const value = `${down ? '▼' : '▲'} ${Math.abs(pct).toFixed(1)}%`;
  return (
    <StatCell
      label={label}
      value={value}
      valueColor={down ? colors.priceLow : colors.priceHigh}
    />
  );
}

const PriceStatsComponent = ({ data, unit, fuel, source, includeCurrent = true }: PriceStatsProps) => {
  const { t } = useTranslation();
  const { colors, scheme } = useThemeTokens();
  const benchmarks = usePriceBenchmarks();
  const stats = statsFor(data);
  if (!stats) return null;

  return (
    <View className="flex-row flex-wrap gap-sm">
      {includeCurrent && <StatCell
        label={t('price_trends.stat_current')}
        value={`${stats.current.toFixed(3)}${unit}`}
        valueColor={priceLevelColor(priceLevel(stats.current, fuel, source, benchmarks), colors, scheme)}
      />}
      <ChangeCell label={t('price_trends.stat_change_7d')} pct={stats.change7dPct} />
      <ChangeCell label={t('price_trends.stat_change_30d')} pct={stats.change30dPct} />
      <StatCell label={t('price_trends.stat_min')} value={stats.min.toFixed(3)} />
      <StatCell label={t('price_trends.stat_max')} value={stats.max.toFixed(3)} />
      <StatCell label={t('price_trends.stat_avg')} value={stats.avg.toFixed(3)} />
    </View>
  );
};

export const PriceStats = memo(PriceStatsComponent);
