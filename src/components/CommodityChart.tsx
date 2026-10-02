import { useMemo, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import { Line, Path, Svg, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';

import type { CommodityDataPoint } from '../api/siphonClient';

const PADDING = { top: 8, right: 12, bottom: 24, left: 36 };
const HEIGHT = 200;

function buildPath(pts: CommodityDataPoint[], xScale: (point: CommodityDataPoint) => number, yLerp: (v: number) => number) {
  return pts
    .map((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd} ${xScale(p)},${yLerp(p.value)}`;
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

export function CommodityChart({ dataA: rawA, dataB: rawB, labelA, labelB, pendingLabel }: CommodityChartProps) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const [width, setWidth] = useState(0);
  const { dataA, dataB, dates } = useMemo(() => {
    const clean = (points: CommodityDataPoint[]) => points
      .filter(point => Number.isFinite(point.value) && Number.isFinite(Date.parse(point.date)))
      .sort((a, b) => a.date.localeCompare(b.date));
    let a = clean(rawA), b = clean(rawB);
    if (a.length < 2) a = [];
    if (b.length < 2) b = [];
    if (a.length && b.length) {
      // Compare the shared history window, retaining newer observations from
      // either series. Never stretch daily retail points across years of crude.
      const start = a[0].date > b[0].date ? a[0].date : b[0].date;
      const recentA = a.filter(point => point.date >= start);
      const recentB = b.filter(point => point.date >= start);
      if (recentA.length >= 2 && recentB.length >= 2) { a = recentA; b = recentB; }
    }
    return { dataA: a, dataB: b, dates: [...new Set([...a, ...b].map(point => point.date))].sort() };
  }, [rawA, rawB]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next > 0 && next !== width) setWidth(next);
  };

  const hasA = dataA.length >= 2;
  const hasB = dataB.length >= 2;

  if (!hasA && !hasB) {
    return (
      <View style={{ alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.chartLabel }}>{t('market.no_data')}</Text>
      </View>
    );
  }

  const chartW = Math.max(1, width - PADDING.left - PADDING.right);
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const metricsA = hasA ? scalePoints(dataA) : { min: 0, range: 1 };
  const metricsB = hasB ? scalePoints(dataB) : { min: 0, range: 1 };

  const startTime = Date.parse(dates[0]);
  const timeRange = Math.max(1, Date.parse(dates[dates.length - 1]) - startTime);
  const xScale = (date: string) =>
    PADDING.left + ((Date.parse(date) - startTime) / timeRange) * chartW;

  const yLerp = (v: number, min: number, range: number) =>
    PADDING.top + chartH - ((v - min) / range) * chartH;

  const xLabelIndexes = [0, Math.floor((dates.length - 1) / 2), dates.length - 1];

  return (
    <View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: colors.chartLine }} />
          <Text style={{ fontSize: 11, color: hasA ? colors.chartLabel : colors.chartGrid }}>{labelA}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[0, 1].map(index => <View key={index} style={{ width: 6, height: 2, backgroundColor: colors.tint }} />)}
          </View>
          <Text style={{ fontSize: 11, color: hasB ? colors.chartLabel : colors.chartGrid }}>{labelB}</Text>
        </View>
      </View>

      <View onLayout={onLayout} style={{ height: HEIGHT, alignSelf: 'stretch' }}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {/* 3 grid lines: 0%, 50%, 100% */}
            {[0, 50, 100].map((pct) => {
              const y = PADDING.top + chartH - (pct / 100) * chartH;
              return (
                <Line
                  key={pct}
                  x1={PADDING.left}
                  y1={y}
                  x2={width - PADDING.right}
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
                d={buildPath(dataA, (point) => xScale(point.date), (v) => yLerp(v, metricsA.min, metricsA.range))}
                fill="none"
                stroke={colors.chartLine}
                strokeWidth={2}
              />
            )}

            {/* Retail (series B) */}
            {hasB && (
              <Path
                d={buildPath(dataB, (point) => xScale(point.date), (v) => yLerp(v, metricsB.min, metricsB.range))}
                fill="none"
                stroke={colors.tint}
                strokeWidth={2}
                strokeDasharray="6 3"
              />
            )}

            {/* X-axis date labels */}
            {[...new Set(xLabelIndexes)].map((idx) => {
              const date = dates[idx];
              return (
                <SvgText
                  key={date}
                  x={xScale(date)}
                  y={HEIGHT - 6}
                  fill={colors.chartLabel}
                  fontSize={9}
                  textAnchor={idx === 0 ? 'start' : idx === dates.length - 1 ? 'end' : 'middle'}
                >
                  {date.slice(5)}
                </SvgText>
              );
            })}
          </Svg>
        )}
      </View>

      {pendingLabel && <Text style={{ color: colors.chartLabel, fontSize: 11, textAlign: 'center', marginTop: 4 }}>{pendingLabel}</Text>}
    </View>
  );
}
