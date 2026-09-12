import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { GlassBox } from './ui/GlassBox';

export function PriceHistoryExplainer() {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();

  const rows = [
    ['price_trends.info_position_title', 'price_trends.info_position_body'],
    ['price_trends.info_forecast_title', 'price_trends.info_forecast_body'],
    ['price_trends.info_market_title', 'price_trends.info_market_body'],
    ['price_trends.info_weekday_title', 'price_trends.info_weekday_body'],
  ] as const;

  return (
    <GlassBox component="card" className="rounded-md p-md gap-md">
      <Text style={{ color: colors.label }} className="text-headline font-semibold">
        {t('price_trends.info_title')}
      </Text>
      {rows.map(([title, body]) => (
        <View key={title} className="gap-xs">
          <Text style={{ color: colors.label }} className="text-footnote font-semibold">
            {t(title)}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
            {t(body)}
          </Text>
        </View>
      ))}
    </GlassBox>
  );
}
