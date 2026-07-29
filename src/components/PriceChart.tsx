import { Text, View } from 'react-native';
import { Circle, G, Line, Path, Svg, Text as SvgText } from 'react-native-svg';
import { memo } from 'react';
import { useColorScheme } from 'nativewind';

import type { PriceHistoryPoint } from '../hooks/usePriceHistory';
import { tokens } from '../theme/tokens';

interface PriceChartProps {
  data: PriceHistoryPoint[];
  fuelLabel: string;
  width?: number;
  height?: number;
}

const PADDING = { top: 20, right: 16, bottom: 32, left: 50 };

const PriceChartComponent = ({ data, fuelLabel, width = 350, height = 220 }: PriceChartProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = tokens.color[isDark ? 'dark' : 'light'];
  const t = tokens.typography;

  if (data.length < 2) {
    return (
      <View style={{ alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.secondaryLabel }}>
          {data.length === 1 ? 'Only one data point — need at least 2 for a chart.' : 'No price history available.'}
        </Text>
      </View>
    );
  }

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);

  if (!isFinite(minP) || !isFinite(maxP)) {
    return (
      <View style={{ alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.secondaryLabel }}>Invalid price data.</Text>
      </View>
    );
  }

  const range = maxP - minP || 1;

  const xScale = (i: number) => PADDING.left + (i / (data.length - 1)) * chartW;
  const yScale = (v: number) => PADDING.top + chartH - ((v - minP) / range) * chartH;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.price)}`);
  const linePath = `M ${points.join(' L ')}`;

  const yLabels = [minP, (minP + maxP) / 2, maxP];

  return (
    <View>
      <Text style={{ fontSize: t.callout.size, fontWeight: t.callout.weight, textAlign: 'center', marginBottom: 8, color: colors.label }}>
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
                stroke={colors.separator}
                strokeWidth={1}
              />
              <SvgText
                x={PADDING.left - 8}
                y={yScale(v) + 4}
                fill={colors.secondaryLabel}
                fontSize={11}
                textAnchor="end"
              >
                {v.toFixed(3)}
              </SvgText>
            </G>
          ))}
          <Path d={linePath} fill="none" stroke={colors.tint} strokeWidth={2} />
          {data.map((d, i) => (
            <Circle
              key={d.date}
              cx={xScale(i)}
              cy={yScale(d.price)}
              r={3}
              fill={colors.tint}
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
                  fill={colors.secondaryLabel}
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