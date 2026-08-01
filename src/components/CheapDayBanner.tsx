import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { PriceHistoryPoint } from '../api/siphonClient';
import { isCheapDay } from '../utils/priceAnalysis';

interface CheapDayBannerProps {
  data: PriceHistoryPoint[];
}

const CheapDayBannerComponent = ({ data }: CheapDayBannerProps) => {
  const { t } = useTranslation();
  const result = isCheapDay(data);
  if (!result.cheap) return null;

  const subtitle =
    result.reason === 'low30'
      ? t('price_trends.banner_low30')
      : result.dropPct !== null
        ? t('price_trends.banner_drop', { pct: result.dropPct.toFixed(1) })
        : '';

  return (
    <View className="bg-price-low dark:bg-price-low-dark rounded-md px-md py-sm">
      <Text className="text-white font-bold text-callout">{t('price_trends.banner_title')}</Text>
      <Text className="text-white text-footnote mt-0.5">{subtitle}</Text>
    </View>
  );
};

export const CheapDayBanner = memo(CheapDayBannerComponent);
