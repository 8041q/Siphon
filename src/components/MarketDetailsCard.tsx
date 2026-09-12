import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { CommodityDataPoint, CommodityMetrics } from '../api/siphonClient';
import { analyzeMarket } from '../utils/marketAnalysis';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { GlassBox } from './ui/GlassBox';

export function MarketDetailsCard({
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
  const correlation = metrics?.status === 'ok' ? metrics.correlation : null;
  const sections: Array<{ title: string; body: string }> = [
    {
      title: t('market.details_pressure_title'),
      body: t(`market.details_pressure_${insight.pressure}`),
    },
    {
      title: t('market.details_pass_title'),
      body: t(`market.pass_through_${insight.passThrough}`, {
        days: insight.expectedWindowDays ?? '-',
      }),
    },
  ];
  if (correlation !== null && insight.expectedWindowDays !== null) {
    sections.push({
      title: t('market.details_lag_title'),
      body: t('market.details_lag_body', {
        days: insight.expectedWindowDays,
        correlation: correlation.toFixed(2),
        strength: t(`market.correlation_${insight.correlationStrength}`).toLowerCase(),
      }),
    });
  }

  // Do not present the backend rocket/feather deltas as a monthly percentage.
  // The source history is sparse, so multiplying a per-observation delta by 30
  // does not produce a valid monthly rate. Keep the metric out of the UI until
  // the API publishes an explicitly time-normalized definition.
  if (insight.crudeVolatility30 !== null || insight.retailVolatility30 !== null) {
    sections.push({
      title: t('market.details_volatility_title'),
      body: t('market.details_volatility_body', {
        crude: insight.crudeVolatility30 === null ? '-' : `${insight.crudeVolatility30.toFixed(2)}%`,
        retail: insight.retailVolatility30 === null ? '-' : `${insight.retailVolatility30.toFixed(2)}%`,
      }),
    });
  }
  if (insight.brentWtiSpreadPct !== null) {
    sections.push({
      title: t('market.details_spread_title'),
      body: t('market.details_spread_body', {
        spread: `${insight.brentWtiSpreadPct > 0 ? '+' : ''}${insight.brentWtiSpreadPct.toFixed(1)}%`,
      }),
    });
  }
  return (
    <GlassBox component="card" className="rounded-md p-md gap-md">
      <Text style={{ color: colors.label }} className="text-headline font-semibold">
        {t('market.details_title')}
      </Text>
      {sections.map((section) => (
        <View key={section.title} className="gap-xs">
          <Text style={{ color: colors.label }} className="text-footnote font-semibold">
            {section.title}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
            {section.body}
          </Text>
        </View>
      ))}
      <Text style={{ color: colors.tertiaryLabel }} className="text-caption-1">
        {t('market.disclaimer')}
      </Text>
    </GlassBox>
  );
}
