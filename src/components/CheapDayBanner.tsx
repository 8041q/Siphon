import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { useSupport } from '../hooks/useSupport';
import { useStyleConfig, applyComponentRules } from '../hooks/useStyleConfig';
import type { PriceHistoryPoint } from '../api/siphonClient';
import { isCheapDay } from '../utils/priceAnalysis';

interface CheapDayBannerProps {
  data: PriceHistoryPoint[];
}

const CheapDayBannerComponent = ({ data }: CheapDayBannerProps) => {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'banner');
  const result = isCheapDay(data);
  if (!result.cheap) return null;

  const subtitle =
    result.reason === 'low30'
      ? t('price_trends.banner_low30')
      : result.dropPct !== null
        ? t('price_trends.banner_drop', { pct: result.dropPct.toFixed(1) })
        : '';

  return (
    <View
      style={[{ backgroundColor: colors.priceLow, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }, applyComponentRules(rules)]}
    >
      <Text style={{ color: colors.labelOnTint }} className="font-bold text-callout">{t('price_trends.banner_title')}</Text>
      <Text style={{ color: colors.labelOnTint }} className="text-footnote mt-0.5">{subtitle}</Text>
    </View>
  );
};

export const CheapDayBanner = memo(CheapDayBannerComponent);
