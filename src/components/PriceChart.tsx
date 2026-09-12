import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { fuelUnit } from '../utils/fuelNames';
import type { PricePoint } from '../utils/priceIntelligence';
import { GlassBox } from './ui/GlassBox';

const DAY = 86_400_000;
const RANGES = [7, 30, 90] as const;
type RangeDays = (typeof RANGES)[number];

type Props = {
  data: readonly PricePoint[];
  fuelLabel: string;
  fuelKey?: string;
  source?: 'ES' | 'PT';
  forecast?: number;
};

type ChartPoint = { x: number; y: number };

function clean(data: readonly PricePoint[]): PricePoint[] {
  return data
    .filter((point) => typeof point.date === 'string' && Number.isFinite(point.price) && point.price > 0)
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function dateLabel(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}


/**
 * Smooth monotone cubic interpolation through the observed values.
 * The tangent limiter prevents the curve from overshooting a local price
 * range, so the line feels fluid without inventing peaks or dips.
 */
function monotoneCurvePath(points: readonly ChartPoint[]): string {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const slopes = new Array<number>(points.length - 1);
  const tangents = new Array<number>(points.length);

  for (let index = 0; index < points.length - 1; index += 1) {
    const dx = Math.max(0.0001, points[index + 1].x - points[index].x);
    slopes[index] = (points[index + 1].y - points[index].y) / dx;
  }

  tangents[0] = slopes[0];
  tangents[points.length - 1] = slopes[slopes.length - 1];
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = slopes[index - 1];
    const after = slopes[index];
    tangents[index] = before * after <= 0 ? 0 : (before + after) / 2;
  }

  // Fritsch-Carlson limiter: keep each cubic segment monotone whenever the
  // observations themselves are monotone, eliminating spline overshoot.
  for (let index = 0; index < slopes.length; index += 1) {
    const slope = slopes[index];
    if (Math.abs(slope) < 1e-9) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }

    let a = tangents[index] / slope;
    let b = tangents[index + 1] / slope;
    if (a < 0) {
      tangents[index] = 0;
      a = 0;
    }
    if (b < 0) {
      tangents[index + 1] = 0;
      b = 0;
    }

    const magnitude = Math.hypot(a, b);
    if (magnitude > 3) {
      const scale = 3 / magnitude;
      tangents[index] = scale * a * slope;
      tangents[index + 1] = scale * b * slope;
    }
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const dx = next.x - current.x;
    const control1X = current.x + dx / 3;
    const control1Y = current.y + tangents[index] * dx / 3;
    const control2X = next.x - dx / 3;
    const control2Y = next.y - tangents[index + 1] * dx / 3;
    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`;
  }
  return path;
}

export function PriceChart({ data, fuelLabel: label, fuelKey, source, forecast }: Props) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const [range, setRange] = useState<RangeDays>(30);
  const [width, setWidth] = useState(0);
  const unit = fuelUnit(fuelKey ?? '', source);

  const points = useMemo(() => {
    const all = clean(data);
    if (!all.length) return [];
    const latest = new Date(all[all.length - 1].date).getTime();
    const cutoff = latest - (range - 1) * DAY;
    const within = all.filter((point) => new Date(point.date).getTime() >= cutoff);
    return within.length >= 2 ? within : all.slice(-Math.min(all.length, range));
  }, [data, range]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0 && next !== width) setWidth(next);
  };

  if (points.length === 0) {
    return (
      <GlassBox component="card" className="rounded-md p-md">
        <Text style={{ color: colors.secondaryLabel, textAlign: 'center' }}>
          {t('price_chart.no_data')}
        </Text>
      </GlassBox>
    );
  }

  if (points.length === 1) {
    return (
      <GlassBox component="card" className="rounded-md p-md gap-sm">
        <Text style={{ color: colors.label }} className="text-headline font-semibold">
          {t('price_chart.history_title')}
        </Text>
        <Text style={{ color: colors.secondaryLabel, textAlign: 'center' }}>
          {t('price_chart.insufficient_data')}
        </Text>
      </GlassBox>
    );
  }

  const latest = points[points.length - 1];
  const values = points.map((point) => point.price);
  if (Number.isFinite(forecast)) values.push(forecast as number);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(rawMax - rawMin, 0.02);
  const yMin = Math.max(0, rawMin - span * 0.22);
  const yMax = rawMax + span * 0.22;

  const chartHeight = 218;
  const left = 46;
  const right = 14;
  const top = 16;
  const bottom = 30;
  const forecastSpace = Number.isFinite(forecast) ? 42 : 0;
  const plotWidth = Math.max(1, width - left - right - forecastSpace);
  const plotHeight = chartHeight - top - bottom;
  const xFor = (index: number) => left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth);
  const yFor = (price: number) => top + (1 - (price - yMin) / Math.max(0.0001, yMax - yMin)) * plotHeight;

  const chartPoints: ChartPoint[] = points.map((point, index) => ({
    x: xFor(index),
    y: yFor(point.price),
  }));
  const linePath = monotoneCurvePath(chartPoints);
  const bottomY = top + plotHeight;
  const areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${bottomY} L ${chartPoints[0].x} ${bottomY} Z`;
  const changePoints = points.filter((point, index) => index === 0 || Math.abs(point.price - points[index - 1].price) > 0.0005);
  const pointIndex = new Map(points.map((point, index) => [`${point.date}:${point.price}`, index]));
  const gridValues = [0, 1, 2, 3].map((index) => yMax - ((yMax - yMin) * index) / 3);
  const middle = points[Math.floor((points.length - 1) / 2)];
  const forecastX = left + plotWidth + forecastSpace;
  const gradientId = 'price-history-area';

  return (
    <GlassBox component="card" className="rounded-md p-md gap-sm">
      <View className="flex-row items-center justify-between gap-sm">
        <View className="flex-1">
          <Text style={{ color: colors.label }} className="text-headline font-semibold">
            {t('price_chart.history_title')}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
            {label}
          </Text>
        </View>
        <View className="items-end">
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-1">
            {t('price_chart.current_label')}
          </Text>
          <Text style={{ color: colors.label }} className="text-callout font-semibold">
            {latest.price.toFixed(3)}{unit}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-xs">
        {RANGES.map((days) => {
          const selected = range === days;
          return (
            <TouchableOpacity
              key={days}
              activeOpacity={0.7}
              onPress={() => setRange(days)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: selected ? colors.tint : colors.groupedBackground,
              }}
            >
              <Text style={{ color: selected ? colors.labelOnTint : colors.secondaryLabel }} className="text-caption-1 font-semibold">
                {t(`price_chart.range_${days}d`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        onLayout={onLayout}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('price_chart.accessibility_summary', {
          fuel: label,
          current: latest.price.toFixed(3),
          min: rawMin.toFixed(3),
          max: rawMax.toFixed(3),
          unit,
        })}
        style={{ width: '100%', minHeight: chartHeight }}
      >
        {width > 0 && (
          <Svg width={width} height={chartHeight}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.chartLine} stopOpacity="0.22" />
                <Stop offset="1" stopColor={colors.chartLine} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>

            {gridValues.map((value) => {
              const y = yFor(value);
              return (
                <G key={value.toFixed(5)}>
                  <Line x1={left} x2={width - right} y1={y} y2={y} stroke={colors.chartGrid} strokeWidth={1} />
                  <SvgText x={left - 7} y={y + 4} textAnchor="end" fontSize="10" fill={colors.chartLabel}>
                    {value.toFixed(2)}
                  </SvgText>
                </G>
              );
            })}

            <Path d={areaPath} fill={`url(#${gradientId})`} />
            <Path d={linePath} fill="none" stroke={colors.chartLine} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

            {changePoints.map((point) => {
              const index = pointIndex.get(`${point.date}:${point.price}`) ?? 0;
              return (
                <Circle
                  key={`${point.date}:${point.price}:${index}`}
                  cx={xFor(index)}
                  cy={yFor(point.price)}
                  r={index === points.length - 1 ? 4 : 2.4}
                  fill={colors.chartDot}
                  stroke={colors.surface}
                  strokeWidth={index === points.length - 1 ? 2 : 1}
                />
              );
            })}

            {Number.isFinite(forecast) && (
              <>
                <Line
                  x1={xFor(points.length - 1)}
                  y1={yFor(latest.price)}
                  x2={forecastX}
                  y2={yFor(forecast as number)}
                  stroke={colors.tint}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
                <Circle cx={forecastX} cy={yFor(forecast as number)} r={4} fill={colors.tint} />
                <Rect
                  x={Math.max(left, forecastX - 36)}
                  y={Math.max(2, yFor(forecast as number) - 25)}
                  width={36}
                  height={17}
                  rx={8.5}
                  fill={colors.groupedBackground}
                />
                <SvgText
                  x={Math.max(left + 18, forecastX - 18)}
                  y={Math.max(14, yFor(forecast as number) - 13)}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill={colors.tint}
                >
                  {`~${(forecast as number).toFixed(2)}`}
                </SvgText>
              </>
            )}

            <SvgText x={left} y={chartHeight - 7} textAnchor="start" fontSize="10" fill={colors.chartLabel}>
              {dateLabel(points[0].date)}
            </SvgText>
            <SvgText x={left + plotWidth / 2} y={chartHeight - 7} textAnchor="middle" fontSize="10" fill={colors.chartLabel}>
              {dateLabel(middle.date)}
            </SvgText>
            <SvgText x={left + plotWidth} y={chartHeight - 7} textAnchor="end" fontSize="10" fill={colors.chartLabel}>
              {dateLabel(latest.date)}
            </SvgText>
          </Svg>
        )}
      </View>

      {Number.isFinite(forecast) && (
        <View className="flex-row items-center gap-xs">
          <View style={{ width: 16, height: 2, backgroundColor: colors.tint }} />
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-1">
            {t('price_chart.forecast_hint')}
          </Text>
        </View>
      )}
    </GlassBox>
  );
}
