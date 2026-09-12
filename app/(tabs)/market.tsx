import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useCommodities } from '../../src/hooks/useCommodities';
import { CommodityChart } from '../../src/components/CommodityChart';
import { MarketIntelligenceCard } from '../../src/components/MarketIntelligenceCard';
import { MarketDetailsCard } from '../../src/components/MarketDetailsCard';
import { fuelLabel } from '../../src/utils/fuelNames';
import { analyzeMarket } from '../../src/utils/marketAnalysis';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { useAppearanceSupport } from '../../src/hooks/useSupport';
import { useStyleConfig, applyComponentRules } from '../../src/hooks/useStyleConfig';
import { tabBarClearance } from '../../src/theme/layout';

import type { CommodityMetrics } from '../../src/api/siphonClient';

const COUNTRIES = [
  { key: 'es', labelKey: 'market.country_es' },
  { key: 'pt', labelKey: 'market.country_pt' },
  { key: 'combined', labelKey: 'market.country_combined' },
] as const;

type CountryKey = (typeof COUNTRIES)[number]['key'];
const FUELS = ['gasoline95', 'diesel'] as const;

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
  const { dashboard, loading, error } = useCommodities({ refresh: false });

  const [country, setCountry] = useState<CountryKey>('combined');
  const [fuel, setFuel] = useState<(typeof FUELS)[number]>('gasoline95');

  const metricKey = `${fuel}_${country}`;
  const metrics: CommodityMetrics | undefined = dashboard?.metrics?.[metricKey] ?? undefined;
  const retailPoints = dashboard?.retail?.[metricKey] ?? [];
  const crudePoints = dashboard?.crude?.brent ?? [];
  const wtiPoints = dashboard?.crude?.wti ?? [];
  const insight = useMemo(
    () => analyzeMarket(crudePoints, retailPoints, metrics, wtiPoints),
    [crudePoints, retailPoints, metrics, wtiPoints],
  );

  const chipBg = (selected: boolean) => ({
    backgroundColor: selected ? colors.tint : colors.surface,
  });
  const chipText = (selected: boolean) => ({
    fontSize: 13,
    fontWeight: '600' as const,
    color: selected ? colors.labelOnTint : colors.label,
  });

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

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {COUNTRIES.map((item) => {
            const selected = country === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.7}
                onPress={() => setCountry(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, ...chipBg(selected) }}
              >
                <Text style={chipText(selected)}>{t(item.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {FUELS.map((item) => {
            const selected = fuel === item;
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.7}
                onPress={() => setFuel(item)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, ...chipBg(selected) }}
              >
                <Text style={chipText(selected)}>{fuelLabel(item)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && !dashboard ? (
          <Text style={{ color: colors.chartLabel, textAlign: 'center', padding: 24 }}>
            {t('market.loading')}
          </Text>
        ) : error && !dashboard ? (
          <Text style={{ color: colors.destructive, textAlign: 'center', padding: 24 }}>
            {t('common.something_went_wrong')}
          </Text>
        ) : !dashboard || dashboard.status === 'no_crude' ? (
          <Text style={{ color: colors.chartLabel, textAlign: 'center', padding: 24 }}>
            {t('market.no_data')}
          </Text>
        ) : crudePoints.length < 2 && retailPoints.length < 2 ? (
          <Text style={{ color: colors.chartLabel, textAlign: 'center', padding: 24 }}>
            {t('market.no_data')}
          </Text>
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
