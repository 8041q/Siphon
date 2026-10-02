import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { analyzePriceHistory, type PricePoint } from '../utils/priceIntelligence';
import { GlassBox } from './ui/GlassBox';

export function PriceIntelligenceCard({ data }: { data: readonly PricePoint[] }) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const analysis = useMemo(() => analyzePriceHistory(data), [data]);
  if (!analysis) return null;

  const statusColor = analysis.status === 'low'
    ? colors.priceLow
    : analysis.status === 'high'
      ? colors.priceHigh
      : colors.priceMid;
  const cheaperThan = Math.max(0, Math.min(100, Math.round(100 - analysis.percentile30)));
  const markerLeft = `${Math.max(2, Math.min(98, analysis.percentile30))}%` as const;

  return (
    <GlassBox component="card" className="rounded-md p-md gap-sm">
      <View className="flex-row items-center justify-between gap-sm">
        <Text style={{ color: colors.label }} className="text-headline font-semibold">
          {t('price_trends.intelligence_title')}
        </Text>
        <Text style={{ color: statusColor }} className="text-footnote font-semibold">
          {t(`price_trends.price_status_${analysis.status}`)}
        </Text>
      </View>

      <View className="gap-xs">
        <View className="flex-row items-center justify-between gap-sm">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
            {t('price_trends.position_label')}
          </Text>
          <Text style={{ color: colors.label }} className="text-footnote font-semibold">
            {t('price_trends.cheaper_than_30d', { percent: cheaperThan })}
          </Text>
        </View>
        <View
          style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: colors.groupedBackground,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: markerLeft,
              top: 0,
              bottom: 0,
              width: 3,
              marginLeft: -1.5,
              borderRadius: 2,
              backgroundColor: statusColor,
            }}
          />
        </View>
        <View className="flex-row justify-between">
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-2">
            {t('price_trends.position_low')}
          </Text>
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-2">
            {t('price_trends.position_high')}
          </Text>
        </View>
      </View>

      <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
        {analysis.daysSinceChange === null
          ? t('price_trends.last_change_unknown')
          : t('price_trends.last_change_summary', { count: analysis.daysSinceChange })}
      </Text>
    </GlassBox>
  );
}
