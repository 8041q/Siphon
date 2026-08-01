import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { PriceHistoryPoint } from '../api/siphonClient';
import { statsFor } from '../utils/priceAnalysis';

interface PriceStatsProps {
  data: PriceHistoryPoint[];
  unit: string;
}

function priceClass(price: number): string {
  if (price < 1.65) return 'text-price-low dark:text-price-low-dark';
  if (price < 1.87) return 'text-price-mid dark:text-price-mid-dark';
  return 'text-price-high dark:text-price-high-dark';
}

function StatCell({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <View className="flex-1 basis-[30%] min-w-[88px]">
      <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{label}</Text>
      <Text className={`text-title-3 font-bold mt-0.5 ${valueClass ?? 'text-label dark:text-label-dark'}`}>
        {value}
      </Text>
    </View>
  );
}

function ChangeCell({ label, pct }: { label: string; pct: number | null }) {
  const { t } = useTranslation();
  if (pct === null) return <StatCell label={label} value="—" />;
  const down = pct <= 0;
  const value = `${down ? '▼' : '▲'} ${Math.abs(pct).toFixed(1)}%`;
  return (
    <StatCell
      label={label}
      value={value}
      valueClass={down ? 'text-price-low dark:text-price-low-dark' : 'text-price-high dark:text-price-high-dark'}
    />
  );
}

const PriceStatsComponent = ({ data, unit }: PriceStatsProps) => {
  const { t } = useTranslation();
  const stats = statsFor(data);
  if (!stats) return null;

  return (
    <View className="flex-row flex-wrap gap-sm">
      <StatCell
        label={t('price_trends.stat_current')}
        value={`${stats.current.toFixed(3)}${unit}`}
        valueClass={priceClass(stats.current)}
      />
      <ChangeCell label={t('price_trends.stat_change_7d')} pct={stats.change7dPct} />
      <ChangeCell label={t('price_trends.stat_change_30d')} pct={stats.change30dPct} />
      <StatCell label={t('price_trends.stat_min')} value={stats.min.toFixed(3)} />
      <StatCell label={t('price_trends.stat_max')} value={stats.max.toFixed(3)} />
      <StatCell label={t('price_trends.stat_avg')} value={stats.avg.toFixed(3)} />
    </View>
  );
};

export const PriceStats = memo(PriceStatsComponent);
