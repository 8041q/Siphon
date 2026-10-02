import { memo, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppearanceLayout } from '../hooks/useAppearanceLayout';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { forecastPrice, historyCoverageDays, PRICE_FORECAST_MIN_DAYS, type PricePoint } from '../utils/priceIntelligence';
import type { MarketInsight } from '../utils/marketAnalysis';
import { GlassBox } from './ui/GlassBox';
import { Icon } from './ui/icon';

interface PriceForecastProps {
  data: readonly PricePoint[];
  unit: string;
  marketInsight?: MarketInsight | null;
}

const HORIZONS = [3, 7] as const;

const PriceForecastComponent = ({ data, unit, marketInsight }: PriceForecastProps) => {
  const { t, i18n } = useTranslation();
  const { colors } = useThemeTokens();
  const { numericStyle, space } = useAppearanceLayout();
  const [showDetails, setShowDetails] = useState(false);
  const coverage = useMemo(() => historyCoverageDays(data), [data]);
  const results = useMemo(() => HORIZONS.map(days => forecastPrice(data, days)), [data]);
  const available = results.some(result => result !== null);
  const priceUnit = unit === '€' ? '€/L' : unit;
  const asOfDate = results.find(result => result !== null)?.asOfDate;
  const formatDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(i18n?.language, { day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <GlassBox component="card" className="rounded-md p-md gap-md">
      <View className="gap-xs">
        <Text style={{ color: colors.label }} className="text-subheadline font-semibold">
          {t('price_trends.forecast_title')}
        </Text>
        <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
          {t('price_trends.forecast_notice')}
        </Text>
      </View>

      {!available ? (
        <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
          {coverage < PRICE_FORECAST_MIN_DAYS
            ? t('price_trends.forecast_locked', { days: PRICE_FORECAST_MIN_DAYS - coverage })
            : t('price_trends.forecast_unreliable')}
        </Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {results.map((result, index) => (
              <View key={HORIZONS[index]} style={{ flex: 1, minWidth: 130, backgroundColor: colors.groupedBackground, borderRadius: 10, padding: space.md, gap: 6 }}>
                <Text style={{ color: colors.label }} className="text-caption-1 font-semibold">
                  {t(`price_trends.forecast_day_${HORIZONS[index]}`)}
                </Text>
                {result ? (
                  <>
                    <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
                      {t('price_trends.forecast_target', { date: formatDate(result.targetDate) })}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 4 }}>
                      <Text style={[numericStyle, { color: colors.tint }]} className="text-headline font-bold">
                        {result.predicted.toFixed(3)}
                      </Text>
                      <Text style={{ color: colors.secondaryLabel }} className="text-caption-2">{priceUnit}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        {result.direction === 'down'
                          ? <Icon name="arrow.down" size={14} color={colors.priceLow} />
                          : result.direction === 'up'
                            ? <Icon name="arrow.up" size={14} color={colors.priceHigh} />
                            : <Icon name="arrow.right" size={14} color={colors.secondaryLabel} />}
                      </View>
                      <Text style={{ flexShrink: 1, color: result.direction === 'down' ? colors.priceLow : result.direction === 'up' ? colors.priceHigh : colors.secondaryLabel }} className="text-caption-1">
                        {t(`price_trends.forecast_outlook_${result.direction}`)}
                      </Text>
                    </View>
                    <View className="gap-xs">
                      <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
                        {t('price_trends.forecast_range_label')}
                      </Text>
                      <Text style={{ color: colors.label }} className="text-caption-1">
                        {t('price_trends.forecast_range', { low: result.low.toFixed(3), high: result.high.toFixed(3) })}
                      </Text>
                    </View>
                    <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
                      {t('price_trends.forecast_accuracy', { level: t(`price_trends.forecast_confidence_${result.confidence}`) })}
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
                    {t('price_trends.forecast_horizon_unavailable')}
                  </Text>
                )}
              </View>
            ))}
          </View>
          {marketInsight && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.xs }}>
              <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
                {t('price_trends.info_market_title')}
              </Text>
              <Text style={{ color: colors.label }} className="text-caption-1">
                {t(`market.pressure_${marketInsight.pressure}`)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowDetails(current => !current)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
            accessibilityLabel={t('price_trends.forecast_details')}
            style={{ paddingVertical: 6, minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.tint }} className="text-caption-1 font-semibold">
              {t(showDetails ? 'price_trends.forecast_hide_details' : 'price_trends.forecast_details')}
            </Text>
          </TouchableOpacity>
          {showDetails && (
            <View style={{ borderTopWidth: 1, borderColor: colors.separator, paddingTop: space.md, gap: space.md }}>
              <View className="gap-xs">
                <Text style={{ color: colors.label }} className="text-caption-1 font-semibold">
                  {t('price_trends.forecast_method_title')}
                </Text>
                <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
                  {t('price_trends.forecast_method_short')}
                </Text>
              </View>
              <View style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  {['forecast_horizon_label', 'forecast_checks_label', 'forecast_error_label'].map((key, index) => (
                    <Text key={key} style={{ flex: 1, color: colors.secondaryLabel, textAlign: index === 0 ? 'left' : 'right' }} className="text-caption-2">
                      {t(`price_trends.${key}`)}
                    </Text>
                  ))}
                </View>
                {results.filter(result => result !== null).map(result => (
                  <View key={result.horizonDays} style={{ flexDirection: 'row', gap: space.sm }}>
                    <Text style={{ flex: 1, color: colors.label }} className="text-caption-1">
                      {t('price_trends.forecast_horizon_value', { days: result.horizonDays })}
                    </Text>
                    <Text style={{ flex: 1, color: colors.label, textAlign: 'right' }} className="text-caption-1">
                      {result.backtestSamples}
                    </Text>
                    <Text style={{ flex: 1, color: colors.label, textAlign: 'right' }} className="text-caption-1">
                      {result.backtestMae.toFixed(3)} {priceUnit}
                    </Text>
                  </View>
                ))}
              </View>
              {asOfDate && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.xs }}>
                  <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
                    {t('price_trends.forecast_record_date')}
                  </Text>
                  <Text style={{ color: colors.label }} className="text-caption-1">
                    {new Date(`${asOfDate}T00:00:00Z`).toLocaleDateString(i18n?.language, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                  </Text>
                </View>
              )}
              <Text style={{ color: colors.secondaryLabel }} className="text-caption-1">
                {t('price_trends.forecast_accuracy_note')}
                {marketInsight ? ` ${t('price_trends.forecast_market_note')}` : ''}
              </Text>
            </View>
          )}
        </>
      )}
    </GlassBox>
  );
};

export const PriceForecast = memo(PriceForecastComponent);
