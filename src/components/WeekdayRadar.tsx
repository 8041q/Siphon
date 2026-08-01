import { memo } from 'react';
import { Text, View } from 'react-native';
import { Circle, G, Line, Polygon, Svg, Text as SvgText } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import type { PriceHistoryPoint } from '../api/siphonClient';
import { weekdayCycle, WEEKDAY_ORDER, weekdayI18nKey } from '../utils/priceAnalysis';
import { tokens } from '../theme/tokens';

interface WeekdayRadarProps {
  data: PriceHistoryPoint[];
}

const WIDTH = 300;
const HEIGHT = 300;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2 - 6;
const RADIUS = 96;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function weekdayAngle(i: number): number {
  return -80 + (i * 360) / 7;
}

const WeekdayRadarComponent = ({ data }: WeekdayRadarProps) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = tokens.color[isDark ? 'dark' : 'light'];

  const cycle = weekdayCycle(data);

  if (!cycle) {
    return (
      <View className="bg-surface dark:bg-surface-dark rounded-md p-lg">
        <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs uppercase tracking-wide">
          {t('price_trends.weekday_title')}
        </Text>
        <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">
          {t('price_trends.weekday_insufficient')}
        </Text>
      </View>
    );
  }

  const { averages, bestDay } = cycle;
  const orderVals = WEEKDAY_ORDER.map((d) => averages[d]);
  const present = orderVals.filter((v): v is number => v !== null);
  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min || 1;

  const points = WEEKDAY_ORDER.map((day, i) => {
    const v = averages[day];
    const radius = v === null ? 0 : RADIUS * (0.2 + 0.8 * ((v - min) / range));
    return { x: polar(CENTER_X, CENTER_Y, radius, weekdayAngle(i)).x, y: polar(CENTER_X, CENTER_Y, radius, weekdayAngle(i)).y, day, nullVal: v === null };
  });

  const polygon = points
    .filter((p) => !p.nullVal)
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <View className="bg-surface dark:bg-surface-dark rounded-md p-lg items-center">
      <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-sm uppercase tracking-wide self-start">
        {t('price_trends.weekday_title')}
      </Text>
      <Svg width={WIDTH} height={HEIGHT}>
        <G>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <Circle
              key={`ring-${f}`}
              cx={CENTER_X}
              cy={CENTER_Y}
              r={RADIUS * f}
              stroke={colors.separator}
              strokeWidth={1}
              fill="none"
            />
          ))}
          {WEEKDAY_ORDER.map((_, i) => {
            const angle = weekdayAngle(i);
            const outer = polar(CENTER_X, CENTER_Y, RADIUS + 18, angle);
            const inner = polar(CENTER_X, CENTER_Y, RADIUS * 0.25, angle);
            return (
              <Line key={`axis-${i}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={colors.separator} strokeWidth={1} />
            );
          })}
          <Polygon points={polygon} fill={colors.tint} fillOpacity={0.18} stroke={colors.tint} strokeWidth={2} />
          {points.map((p, i) => {
            if (p.nullVal) return null;
            const isBest = p.day === bestDay;
            return (
              <Circle
                key={`point-${i}`}
                cx={p.x}
                cy={p.y}
                r={isBest ? 5 : 3.5}
                fill={isBest ? colors.tint : colors.secondaryLabel}
              />
            );
          })}
          {WEEKDAY_ORDER.map((day, i) => {
            const angle = weekdayAngle(i);
            const label = polar(CENTER_X, CENTER_Y, RADIUS + 30, angle);
            const isBest = day === bestDay;
            return (
              <SvgText
                key={`label-${i}`}
                x={label.x}
                y={label.y}
                fill={isBest ? colors.tint : colors.secondaryLabel}
                fontSize={11}
                fontWeight={isBest ? '700' : '400'}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {t(`station.${weekdayI18nKey(day)}`)}
              </SvgText>
            );
          })}
        </G>
      </Svg>
      <Text className="text-callout font-semibold text-label dark:text-label-dark mt-sm">
        {t('price_trends.weekday_best_day', { day: t(`station.${weekdayI18nKey(bestDay)}`) })}
      </Text>
    </View>
  );
};

export const WeekdayRadar = memo(WeekdayRadarComponent);
