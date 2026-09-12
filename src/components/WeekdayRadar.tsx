import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';
import type { PricePoint } from '../utils/priceIntelligence';
import { GlassBox } from './ui/GlassBox';

const DAY = 86_400_000;

export function WeekdayRadar({ data }: { data: readonly PricePoint[] }) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();

  const analysis = useMemo(() => {
    const points = data
      .filter((point) => typeof point.date === 'string' && Number.isFinite(point.price) && point.price > 0)
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (points.length < 2) return null;
    const coverage = Math.floor((new Date(points[points.length - 1].date).getTime() - new Date(points[0].date).getTime()) / DAY) + 1;
    if (coverage < 14) return null;

    const buckets = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
    for (const point of points) {
      const day = new Date(`${point.date}T12:00:00`).getDay();
      buckets[day].total += point.price;
      buckets[day].count += 1;
    }
    const averages = buckets.map((bucket) => bucket.count ? bucket.total / bucket.count : null);
    const available = averages.filter((value): value is number => value !== null);
    if (available.length < 4) return null;
    const min = Math.min(...available);
    const max = Math.max(...available);
    let bestDay = 0;
    let bestValue = Number.POSITIVE_INFINITY;
    averages.forEach((value, index) => {
      if (value !== null && value < bestValue) {
        bestValue = value;
        bestDay = index;
      }
    });
    return { averages, min, max, bestDay };
  }, [data]);

  const dayKeys = [
    'station.day_d',
    'station.day_l',
    'station.day_m',
    'station.day_x',
    'station.day_j',
    'station.day_v',
    'station.day_s',
  ] as const;

  return (
    <GlassBox component="card" className="rounded-md p-md gap-sm">
      <View className="flex-row items-center justify-between gap-sm">
        <Text style={{ color: colors.label }} className="text-headline font-semibold">
          {t('price_trends.weekday_title')}
        </Text>
        {analysis && (
          <Text style={{ color: colors.tint }} className="text-caption-1 font-semibold">
            {t('price_trends.weekday_best_short', { day: t(dayKeys[analysis.bestDay]) })}
          </Text>
        )}
      </View>

      {!analysis ? (
        <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
          {t('price_trends.weekday_insufficient')}
        </Text>
      ) : (
        <View className="flex-row items-end justify-between gap-xs" style={{ height: 84 }}>
          {analysis.averages.map((average, index) => {
            const span = Math.max(0.001, analysis.max - analysis.min);
            const normalized = average === null ? 0 : (average - analysis.min) / span;
            const height = average === null ? 8 : 28 + normalized * 30;
            const best = index === analysis.bestDay;
            return (
              <View key={dayKeys[index]} className="flex-1 items-center justify-end gap-xs">
                {average !== null && (
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ color: best ? colors.tint : colors.tertiaryLabel, fontSize: 9 }}
                  >
                    {average.toFixed(3)}
                  </Text>
                )}
                <View
                  style={{
                    width: '62%',
                    minWidth: 12,
                    maxWidth: 24,
                    height,
                    borderRadius: 6,
                    backgroundColor: best ? colors.tint : colors.chartLine,
                    opacity: average === null ? 0.18 : best ? 1 : 0.48,
                  }}
                />
                <Text style={{ color: best ? colors.tint : colors.secondaryLabel }} className="text-caption-2 font-semibold">
                  {t(dayKeys[index])}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </GlassBox>
  );
}
