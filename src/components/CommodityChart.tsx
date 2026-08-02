import { Text, View } from 'react-native';
import { Line, Path, Svg, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';

import type { CommodityDataPoint } from '../api/siphonClient';

const PADDING = { top: 8, right: 12, bottom: 24, left: 36 };
const WIDTH = 350;
const HEIGHT = 200;

function buildPath(pts: CommodityDataPoint[], xScale: (i: number) => number, yLerp: (v: number) => number) {
  return pts
    .map((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd} ${xScale(i)},${yLerp(p.value)}`;
    })
    .join(' ');
}

function scalePoints(pts: CommodityDataPoint[]): { min: number; range: number } {
  const values = pts.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, range: max - min || 1 };
}

interface CommodityChartProps {
  dataA: CommodityDataPoint[];
  dataB: CommodityDataPoint[];
  labelA: string;
  labelB: string;
  pendingLabel?: string;
}

export function CommodityChart({ dataA, dataB, labelA, labelB, pendingLabel }: CommodityChartProps) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();

  const hasA = dataA.length >= 2;
  const hasB = dataB.length >= 2;

  if (!hasA && !hasB) {
    return (
      <View style={{ alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.chartLabel }}>{t('market.no_data')}</Text>
      </View>
    );
  }

  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const metricsA = hasA ? scalePoints(dataA) : { min: 0, range: 1 };
  const metricsB = hasB ? scalePoints(dataB) : { min: 0, range: 1 };

  const xScale = (i: number, len: number) =>
    PADDING.left + (i / Math.max(len - 1, 1)) * chartW;

  const yLerp = (v: number, min: number, range: number) =>
    PADDING.top + chartH - ((v - min) / range) * chartH;

  const xLabelMain = hasA ? dataA : dataB;
  const xLabelStep = Math.max(1, Math.floor(xLabelMain.length / 5));

  return (
    <View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: colors.chartLine }} />
          <Text style={{ fontSize: 11, color: hasA ? colors.chartLabel : colors.chartGrid }}>{labelA}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: colors.tint }} />
          <Text style={{ fontSize: 11, color: hasB ? colors.chartLabel : colors.chartGrid }}>{labelB}</Text>
        </View>
      </View>

      <Svg width={WIDTH} height={HEIGHT}>
        {/* 3 grid lines: 0%, 50%, 100% */}
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
        {hasA && (
          <Path
            d={buildPath(dataA, (i) => xScale(i, dataA.length), (v) => yLerp(v, metricsA.min, metricsA.range))}
            fill="none"
            stroke={colors.chartLine}
            strokeWidth={2}
          />
        )}

        {/* Retail (series B) */}
        {hasB && (
          <Path
            d={buildPath(dataB, (i) => xScale(i, dataB.length), (v) => yLerp(v, metricsB.min, metricsB.range))}
            fill="none"
            stroke={colors.tint}
            strokeWidth={2}
          />
        )}

        {/* X-axis date labels */}
        {xLabelMain
          .filter((_, i) => i % xLabelStep === 0 || i === xLabelMain.length - 1)
          .map((p) => {
            const idx = xLabelMain.indexOf(p);
            return (
              <SvgText
                key={p.date}
                x={xScale(idx, xLabelMain.length)}
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

      {pendingLabel && <Text style={{ color: colors.chartLabel, fontSize: 11, textAlign: 'center', marginTop: 4 }}>{pendingLabel}</Text>}
    </View>
  );
}