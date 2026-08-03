import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { useSupport } from '../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../hooks/useStyleConfig';
import { GlassBackdrop } from './ui/glass';
import type { PriceHistoryPoint } from '../api/siphonClient';
import { forecast, FORECAST_HORIZONS, FORECAST_MIN_DAYS, historyCoverageDays } from '../utils/priceAnalysis';

interface PriceForecastProps {
  data: PriceHistoryPoint[];
  unit: string;
}

const CONFIDENCE_KEYS: Record<string, string> = {
  high: 'price_trends.forecast_confidence_high',
  medium: 'price_trends.forecast_confidence_medium',
  low: 'price_trends.forecast_confidence_low',
};

function ForecastCell({ labelKey, value, range }: { labelKey: string; value: string; range: string }) {
  const { colors } = useThemeTokens();
  return (
    <View style={{ backgroundColor: colors.groupedBackground }} className="rounded-md px-md py-sm">
      <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{labelKey}</Text>
      <Text style={{ color: colors.label }} className="text-title-3 font-bold mt-0.5">{value}</Text>
      <Text style={{ color: colors.tertiaryLabel }} className="text-footnote mt-0.5">{range}</Text>
    </View>
  );
}

const PriceForecastComponent = ({ data, unit }: PriceForecastProps) => {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const cardRules = useStyleConfig(styleRules, 'card');
  const cardGlass = isGlass(cardRules);
  const coverage = historyCoverageDays(data);

  const locked = coverage < FORECAST_MIN_DAYS;
  const daysToGo = Math.max(0, FORECAST_MIN_DAYS - coverage);

  const results = locked
    ? []
    : FORECAST_HORIZONS.map((h) => forecast(data, h)).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <View style={[{ backgroundColor: cardGlass ? 'transparent' : colors.surface }, applyComponentRules(cardRules)]} className="rounded-md p-lg gap-sm">
      {cardGlass && <GlassBackdrop color={colors.surface} />}
      <Text style={{ color: colors.label }} className="text-footnote font-semibold uppercase tracking-wide">
        {t('price_trends.forecast_title')}
      </Text>

      {locked ? (
        <Text style={{ color: colors.secondaryLabel }} className="text-callout">
          {t('price_trends.forecast_locked', { days: daysToGo })}
        </Text>
      ) : (
        <>
          <View className="flex-row gap-sm">
            {results.map((result) => {
              const last = result.predicted[result.predicted.length - 1];
              const labelKey = result.horizon === 3 ? t('price_trends.forecast_day_3') : t('price_trends.forecast_day_7');
              return (
                <ForecastCell
                  key={result.horizon}
                  labelKey={labelKey}
                  value={`${last.price.toFixed(3)}${unit}`}
                  range={t('price_trends.forecast_range', { low: result.low.toFixed(3), high: result.high.toFixed(3) })}
                />
              );
            })}
          </View>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
            {t('price_trends.forecast_confidence', { level: t(CONFIDENCE_KEYS[results[0]?.confidence ?? 'low'] ?? 'price_trends.forecast_confidence_low') })}
          </Text>
          <Text style={{ color: colors.tertiaryLabel }} className="text-footnote">
            {t('price_trends.forecast_disclaimer')}
          </Text>
        </>
      )}
    </View>
  );
};

export const PriceForecast = memo(PriceForecastComponent);
