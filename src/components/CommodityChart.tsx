import { Text, View } from 'react-native';
import { Line, Path, Svg, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';

import type { CommodityDataPoint } from '../api/siphonClient';

interface CommodityChartProps {
  dataA: CommodityDataPoint[];
  dataB: CommodityDataPoint[];
  labelA: string;
  labelB: string;
}

const PADDING = { top: 8, right: 12, bottom: 24, left: 36 };
const WIDTH = 350;
const HEIGHT = 200;

export function CommodityChart({ dataA, dataB, labelA, labelB }: CommodityChartProps) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();

  if (dataA.length < 2 || dataB.length < 2) {
    return (
      <View style={{ alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.chartLabel }}>{t('market.no_data')}</Text>
      </View>
    );
  }

  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const minA = Math.min(...dataA.map((p) => p.value));
  const maxA = Math.max(...dataA.map((p) => p.value));
  const rangeA = maxA - minA || 1;

  const minB = Math.min(...dataB.map((p) => p.value));
  const maxB = Math.max(...dataB.map((p) => p.value));
  const rangeB = maxB - minB || 1;

  const xScale = (i: number, len: number) =>
    PADDING.left + (i / Math.max(len - 1, 1)) * chartW;

  const yLerp = (v: number, min: number, range: number) =>
    PADDING.top + chartH - ((v - min) / range) * chartH;

  const buildPath = (pts: CommodityDataPoint[], min: number, range: number) =>
    pts
      .map((p, i) => {
        const cmd = i === 0 ? 'M' : 'L';
        return `${cmd} ${xScale(i, pts.length)},${yLerp(p.value, min, range)}`;
      })
      .join(' ');

  const xLabelStep = Math.max(1, Math.floor(dataA.length / 5));

  return (
    <View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: colors.chartLine }} />
          <Text style={{ fontSize: 11, color: colors.chartLabel }}>{labelA}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: colors.tint }} />
          <Text style={{ fontSize: 11, color: colors.chartLabel }}>{labelB}</Text>
        </View>
      </View>

      <Svg width={WIDTH} height={HEIGHT}>
        {/* 3% horizontal grid lines: 0%, 50%, 100% */}
        {[0, 50, 100].map((pct) => {
          const y = PADDING.top + chartH - (pct / 100) * chartH;
          return (
            <Line
              key={pct}
              x1={PADDING.left}
              y1={y}
              x2={WIDTH - PADDING.right}
              y2={y}
              stroke={colors.chartGrid}
              strokeWidth={1}
            />
          );
        })}

        {[100, 50, 0].map((pct) => {
          const y = PADDING.top + chartH - (pct / 100) * chartH;
          return (
            <SvgText
              key={`lbl-${pct}`}
              x={PADDING.left - 6}
              y={y + 4}
              fill={colors.chartLabel}
              fontSize={9}
              textAnchor="end"
            >
              {pct}%
            </SvgText>
          );
        })}

        {/* Crude (series A) */}
        <Path d={buildPath(dataA, minA, rangeA)} fill="none" stroke={colors.chartLine} strokeWidth={2} />

        {/* Retail (series B) */}
        <Path d={buildPath(dataB, minB, rangeB)} fill="none" stroke={colors.tint} strokeWidth={2} />

        {/* X-axis date labels */}
        {dataA
          .filter((_, i) => i % xLabelStep === 0 || i === dataA.length - 1)
          .map((p) => {
            const idx = dataA.indexOf(p);
            return (
              <SvgText
                key={p.date}
                x={xScale(idx, dataA.length)}
                y={HEIGHT - 6}
                fill={colors.chartLabel}
                fontSize={9}
                textAnchor="middle"
              >
                {p.date.slice(5)}
              </SvgText>
            );
          })}
      </Svg>
    </View>
  );
}