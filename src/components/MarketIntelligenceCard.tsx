import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { CommodityDataPoint, CommodityMetrics } from '../api/siphonClient';
import { analyzeMarket } from '../utils/marketAnalysis';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { GlassBox } from './ui/GlassBox';

export function MarketIntelligenceCard({
  crude,
  wti = [],
  retail,
  metrics,
}: {
  crude: readonly CommodityDataPoint[];
  wti?: readonly CommodityDataPoint[];
  retail: readonly CommodityDataPoint[];
  metrics?: CommodityMetrics;
}) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const insight = useMemo(
    () => analyzeMarket(crude, retail, metrics, wti),
    [crude, retail, metrics, wti],
  );
  const pressureColor = insight.pressure === 'up'
    ? colors.priceHigh
    : insight.pressure === 'down'
      ? colors.priceLow
      : colors.priceMid;

  return (
    <GlassBox component="card" className="rounded-md p-md gap-md">
      <View className="flex-row items-center justify-between gap-sm">
        <View className="flex-1">
          <Text style={{ color: colors.label }} className="text-headline font-semibold">
            {t('market.intelligence_title')}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote mt-xs">
            {t(`market.pass_through_${insight.passThrough}`, {
              days: insight.expectedWindowDays ?? '-',
            })}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
            backgroundColor: `${pressureColor}18`,
          }}
        >
          <Text style={{ color: pressureColor }} className="text-footnote font-semibold">
            {t(`market.pressure_${insight.pressure}`)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-sm">
        <View className="flex-1 gap-xs">
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-1">
            {t('market.retail_position')}
          </Text>
          <Text style={{ color: colors.label }} className="text-callout font-semibold">
            {insight.retailPercentile90 === null ? '-' : `${Math.round(insight.retailPercentile90)}%`}
          </Text>
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-2">
            {t('market.days_90')}
          </Text>
        </View>
        <View className="flex-1 gap-xs">
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-1">
            {t('market.lag_label')}
          </Text>
          <Text style={{ color: colors.label }} className="text-callout font-semibold">
            {insight.expectedWindowDays === null
              ? '-'
              : t('market.lag_days', { days: insight.expectedWindowDays })}
          </Text>
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-2">
            {t('market.reaction_window')}
          </Text>
        </View>
        <View className="flex-1 gap-xs">
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-1">
            {t('market.signal_label')}
          </Text>
          <Text style={{ color: colors.label }} className="text-callout font-semibold">
            {t(`market.correlation_${insight.correlationStrength}`)}
          </Text>
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-2">
            {t('market.signal_quality_short')}
          </Text>
        </View>
      </View>
    </GlassBox>
  );
}
