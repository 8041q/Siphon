import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ScreenState } from '../../src/components/ui/ScreenState';
import { useCommodities } from '../../src/hooks/useCommodities';
import { CommodityChart } from '../../src/components/CommodityChart';
import { MarketIntelligenceCard } from '../../src/components/MarketIntelligenceCard';
import { MarketDetailsCard } from '../../src/components/MarketDetailsCard';
import { MarketFilters, type MarketCountry, type MarketFuel } from '../../src/components/MarketFilters';
import { analyzeMarket } from '../../src/utils/marketAnalysis';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { useAppearanceSupport } from '../../src/hooks/useSupport';
import { useStyleConfig, applyComponentRules } from '../../src/hooks/useStyleConfig';
import { tabBarClearance } from '../../src/theme/layout';

import type { CommodityMetrics } from '../../src/api/siphonClient';

function formatPct(value: number | null): string {
  if (value === null) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default function MarketScreen() {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { styleRules } = useAppearanceSupport();
  const cardRules = useStyleConfig(styleRules, 'card');
  const cardStyle = applyComponentRules(cardRules, colors.label);
  const { dashboard, loading, error, reload } = useCommodities({ refresh: false });

  const [country, setCountry] = useState<MarketCountry>('combined');
  const [fuel, setFuel] = useState<MarketFuel>('gasoline95');

  const metricKey = `${fuel}_${country}`;
  const metrics: CommodityMetrics | undefined = dashboard?.metrics?.[metricKey] ?? undefined;
  const retailPoints = dashboard?.retail?.[metricKey] ?? [];
  const crudePoints = dashboard?.crude?.brent ?? [];
  const wtiPoints = dashboard?.crude?.wti ?? [];
  const insight = useMemo(
    () => analyzeMarket(crudePoints, retailPoints, metrics, wtiPoints),
    [crudePoints, retailPoints, metrics, wtiPoints],
  );

  const snapshot = [
    { label: t('market.crude_7d'), value: formatPct(insight.crude7), raw: insight.crude7 },
    { label: t('market.crude_30d'), value: formatPct(insight.crude30), raw: insight.crude30 },
    { label: t('market.retail_7d'), value: formatPct(insight.retail7), raw: insight.retail7 },
    { label: t('market.retail_30d'), value: formatPct(insight.retail30), raw: insight.retail30 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarClearance(insets.bottom) + 16 }}
      >
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.label, marginBottom: 4 }}>
          {t('market.title')}
        </Text>
        {dashboard?.lastUpdated ? (
          <Text style={{ color: colors.tertiaryLabel, fontSize: 11, marginBottom: 16 }}>
            {t('market.updated_at', { date: dashboard.lastUpdated })}
          </Text>
        ) : (
          <View style={{ height: 12 }} />
        )}

        <MarketFilters
          country={country}
          fuel={fuel}
          onCountryChange={setCountry}
          onFuelChange={setFuel}
        />

        {loading && !dashboard ? (
          <ScreenState message={t('market.loading')} />
        ) : error && !dashboard ? (
          <ScreenState error message={t('common.something_went_wrong')} action={t('common.retry')} onAction={reload} />
        ) : !dashboard || dashboard.status === 'no_crude' ? (
          <ScreenState message={t('market.no_data')} />
        ) : crudePoints.length < 2 && retailPoints.length < 2 ? (
          <ScreenState message={t('market.no_data')} />
        ) : (
          <View style={{ gap: 12 }}>
            <MarketIntelligenceCard
              crude={crudePoints}
              wti={wtiPoints}
              retail={retailPoints}
              metrics={metrics}
            />

            <CommodityChart
              dataA={crudePoints}
              dataB={retailPoints}
              labelA={t('market.crude_label')}
              labelB={t('market.retail_label')}
              pendingLabel={retailPoints.length < 2 ? t('market.insufficient_hint') : undefined}
            />

            <View>
              <Text style={{ color: colors.secondaryLabel, marginBottom: 8 }} className="text-footnote font-semibold uppercase tracking-wide">
                {t('market.snapshot_title')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {snapshot.map((item) => {
                  const valueColor = item.raw === null
                    ? colors.secondaryLabel
                    : item.raw > 0
                      ? colors.priceHigh
                      : item.raw < 0
                        ? colors.priceLow
                        : colors.priceMid;
                  return (
                    <View
                      key={item.label}
                      style={[
                        {
                          flexGrow: 1,
                          flexBasis: '47%',
                          backgroundColor: colors.groupedBackground,
                          borderRadius: 12,
                          padding: 12,
                        },
                        cardStyle,
                      ]}
                    >
                      <Text style={{ color: colors.tertiaryLabel }} className="text-caption-1">
                        {item.label}
                      </Text>
                      <Text style={{ color: valueColor }} className="text-title-3 font-semibold mt-xs">
                        {item.value}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {retailPoints.length < 2 && (
              <View style={[{ backgroundColor: colors.groupedBackground, borderRadius: 12, padding: 12 }, cardStyle]}>
                <Text style={{ color: colors.chartLabel, fontSize: 12, textAlign: 'center' }}>
                  {t('market.insufficient_hint')}
                </Text>
              </View>
            )}

            <MarketDetailsCard
              crude={crudePoints}
              wti={wtiPoints}
              retail={retailPoints}
              metrics={metrics}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
