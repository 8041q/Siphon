import { Text, View } from 'react-native';
import { Circle, G, Line, Path, Svg, Text as SvgText } from 'react-native-svg';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { PriceHistoryPoint } from '../hooks/usePriceHistory';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { fuelUnit } from '../utils/fuelNames';

interface PriceChartProps {
  data: PriceHistoryPoint[];
  fuelLabel: string;
  fuelKey?: string;
  source?: string;
  forecast?: PriceHistoryPoint[];
  width?: number;
  height?: number;
}

const PADDING = { top: 20, right: 16, bottom: 32, left: 50 };

const PriceChartComponent = ({ data, fuelLabel, fuelKey, source, forecast, width = 350, height = 220 }: PriceChartProps) => {
  const { t: translate } = useTranslation();
  const { colors } = useThemeTokens();
  const unit = fuelUnit(fuelKey ?? '', source);

  if (data.length < 2) {
    return (
      <View style={{ alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.chartLabel }}>
          {data.length === 1 ? translate('price_chart.insufficient_data') : translate('price_chart.no_data')}
        </Text>
      </View>
    );
  }

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const forecastData = forecast ?? [];
  const combined = [...data, ...forecastData];
  const prices = combined.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);

  if (!isFinite(minP) || !isFinite(maxP)) {
    return (
      <View style={{ alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.chartLabel }}>{translate('price_chart.invalid_data')}</Text>
      </View>
    );
  }

  const range = maxP - minP || 1;

  const xScale = (i: number) => PADDING.left + (i / (combined.length - 1)) * chartW;
  const yScale = (v: number) => PADDING.top + chartH - ((v - minP) / range) * chartH;

  const solidPoints = data.map((d, i) => `${xScale(i)},${yScale(d.price)}`);
  const solidPath = `M ${solidPoints.join(' L ')}`;

  const forecastPoints = combined.slice(data.length - 1).map((d, i) => `${xScale(data.length - 1 + i)},${yScale(d.price)}`);
  const forecastPath = `M ${forecastPoints.join(' L ')}`;

  const yLabels = [minP, (minP + maxP) / 2, maxP];

  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: '400', textAlign: 'center', marginBottom: 8, color: colors.label }}>
        {fuelLabel}
      </Text>
      <Svg width={width} height={height}>
        <G>
          {yLabels.map((v, i) => (
            <G key={`y-${i}`}>
              <Line
                x1={PADDING.left}
                y1={yScale(v)}
                x2={width - PADDING.right}
                y2={yScale(v)}
                stroke={colors.chartGrid}
                strokeWidth={1}
              />
              <SvgText
                x={PADDING.left - 8}
                y={yScale(v) + 4}
                fill={colors.chartLabel}
                fontSize={11}
                textAnchor="end"
              >
                {v.toFixed(3)}{unit}
              </SvgText>
            </G>
          ))}
          <Path d={solidPath} fill="none" stroke={colors.chartLine} strokeWidth={2} />
          {forecastData.length > 0 && (
            <Path d={forecastPath} fill="none" stroke={colors.chartLine} strokeWidth={2} strokeDasharray="6 4" opacity={0.7} />
          )}
          {data.map((d, i) => (
            <Circle
              key={d.date}
              cx={xScale(i)}
              cy={yScale(d.price)}
              r={3}
              fill={colors.chartDot}
            />
          ))}
          {forecastData.map((d, i) => (
            <Circle
              key={d.date}
              cx={xScale(data.length + i)}
              cy={yScale(d.price)}
              r={3}
              fill="none"
              stroke={colors.chartDot}
              strokeWidth={2}
              opacity={0.8}
            />
          ))}
          {data
            .filter((_, i) => {
              const step = Math.max(1, Math.floor(data.length / 5));
              return i % step === 0 || i === data.length - 1;
            })
            .map((d) => {
              const idx = data.indexOf(d);
              return (
                <SvgText
                  key={d.date}
                  x={xScale(idx)}
                  y={height - 8}
                  fill={colors.chartLabel}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {d.date.slice(5)}
                </SvgText>
              );
            })}
        </G>
      </Svg>
    </View>
  );
};

export const PriceChart = memo(PriceChartComponent);