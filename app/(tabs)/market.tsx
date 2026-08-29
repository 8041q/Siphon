import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useCommodities } from '../../src/hooks/useCommodities';
import { CommodityChart } from '../../src/components/CommodityChart';
import { fuelLabel } from '../../src/utils/fuelNames';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { tabBarClearance } from '../../src/theme/layout';

import type { CommodityMetrics } from '../../src/api/siphonClient';

const COUNTRIES: { key: string; labelKey: string }[] = [
  { key: 'es', labelKey: 'market.country_es' },
  { key: 'pt', labelKey: 'market.country_pt' },
  { key: 'combined', labelKey: 'market.country_combined' },
];

const FUELS = ['gasoline95', 'diesel'] as const;

function formatRatio(v: number): string {
  return v === 0 ? '—' : v.toFixed(2);
}

function formatTrend(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function trendColor(v: number | null | undefined, neutral: string): string {
  if (v === null || v === undefined) return neutral;
  return v >= 0 ? '#34C759' : '#FF3B30';
}

export default function MarketScreen() {
  const { t } = useTranslation();
  const { colors, scheme } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const isDark = scheme === 'dark';

  const { dashboard, loading } = useCommodities();

  const [country, setCountry] = useState('combined');
  const [fuel, setFuel] = useState('gasoline95');

  const metricKey = `${fuel}_${country}`;
  const metrics: CommodityMetrics | undefined = dashboard?.metrics?.[metricKey] ?? undefined;

  const retailPoints = dashboard?.retail?.[metricKey] ?? [];
  const crudePoints = dashboard?.crude?.brent ?? [];

  const chipBg = (sel: boolean) => ({
    backgroundColor: sel ? colors.tint : colors.surface,
  });

  const chipText = (sel: boolean) => ({
    fontSize: 13,
    fontWeight: '600' as const,
    color: sel ? '#FFFFFF' : colors.label,
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarClearance(insets.bottom) + 16 }}
      >
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.label, marginBottom: 16 }}>
          {t('market.title')}
        </Text>

        {/* Country selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {COUNTRIES.map((c) => {
            const sel = country === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                activeOpacity={0.7}
                onPress={() => setCountry(c.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                  ...chipBg(sel),
                }}
              >
                <Text style={chipText(sel)}>{t(c.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Fuel selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {FUELS.map((f) => {
            const sel = fuel === f;
            return (
              <TouchableOpacity
                key={f}
                activeOpacity={0.7}
                onPress={() => setFuel(f)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                  ...chipBg(sel),
                }}
              >
                <Text style={chipText(sel)}>{fuelLabel(f)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Loading / Empty states */}
        {loading ? (
          <Text style={{ color: colors.chartLabel, textAlign: 'center', padding: 24 }}>
            {t('market.loading')}
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
          <>
            <CommodityChart
              dataA={crudePoints}
              dataB={retailPoints}
              labelA={t('market.crude_label')}
              labelB={t('market.retail_label')}
              pendingLabel={retailPoints.length < 2 ? t('market.insufficient_hint') : undefined}
            />

            {/* Insufficient retail notice */}
            {retailPoints.length < 2 && (
              <View style={{
                backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                borderRadius: 12,
                padding: 12,
                marginTop: 12,
              }}>
                <Text style={{ color: colors.chartLabel, fontSize: 12, textAlign: 'center' }}>
                  {t('market.insufficient_hint')}
                </Text>
              </View>
            )}

            {/* Metric cards (only fully rendered when retail has meaningful data) */}
            {retailPoints.length >= 2 && (
              <View style={{ gap: 8, marginTop: 12 }}>
                <View style={{
                  backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <Text style={{ fontWeight: '600', color: colors.label }}>
                    {t('market.lag_label')}
                  </Text>
                  <Text style={{ color: colors.chartLabel }}>
                    {metrics && metrics.status === 'ok' ? t('market.lag_days', { days: metrics.lagDays }) : '—'}
                  </Text>
                </View>

                <View style={{
                  backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <Text style={{ fontWeight: '600', color: colors.label, fontSize: 14 }}>
                    {t('market.correlation_label')}
                  </Text>
                  <Text style={{ color: colors.chartLabel }}>
                    {metrics && metrics.status === 'ok' ? metrics.correlation.toFixed(3) : '—'}
                  </Text>
                </View>

                <View style={{
                  backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                  borderRadius: 12,
                  padding: 12,
                }}>
                  <Text style={{ fontWeight: '600', color: colors.label, fontSize: 14, marginBottom: 4 }}>
                    {t('market.rocket_feather_label')}
                  </Text>
                  {metrics && metrics.status === 'ok' ? (
                    <Text style={{ color: colors.chartLabel, fontSize: 12 }}>
                      {t('market.rocket_feather_desc', {
                        rocket: formatRatio(metrics.rocket),
                        feather: formatRatio(metrics.feather),
                        asymmetry: metrics.asymmetry.toFixed(2),
                      })}
                    </Text>
                  ) : (
                    <Text style={{ color: colors.chartLabel, fontSize: 12 }}>
                      {t('market.insufficient_data')}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Crude trend cards (always show when crude exists) */}
            {crudePoints.length >= 2 && (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={{
                  flex: 1,
                  backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                }}>
                  <Text style={{ color: colors.label, fontSize: 13 }}>
                    {t('market.trend_7d')}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: trendColor(metrics?.crudeTrend7d, colors.chartLabel) }}>
                    {formatTrend(metrics?.crudeTrend7d)}
                  </Text>
                </View>
                <View style={{
                  flex: 1,
                  backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                }}>
                  <Text style={{ color: colors.label, fontSize: 13 }}>
                    {t('market.trend_30d')}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: trendColor(metrics?.crudeTrend30d, colors.chartLabel) }}>
                    {formatTrend(metrics?.crudeTrend30d)}
                  </Text>
                </View>
              </View>
            )}

            <Text style={{ color: colors.chartLabel, fontSize: 11, textAlign: 'center', marginTop: 12 }}>
              {t('market.disclaimer')}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}