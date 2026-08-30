import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useApp } from '../../src/hooks/useApp';
import { usePriceHistory } from '../../src/hooks/usePriceHistory';
import { PriceChart } from '../../src/components/PriceChart';
import { PriceStats } from '../../src/components/PriceStats';
import { CheapDayBanner } from '../../src/components/CheapDayBanner';
import { PriceForecast } from '../../src/components/PriceForecast';
import { WeekdayRadar } from '../../src/components/WeekdayRadar';

import { fuelLabel, fuelUnit } from '../../src/utils/fuelNames';
import { getLocationParts } from '../../src/utils/location';
import { forecast, FORECAST_HORIZONS, FORECAST_MIN_DAYS, historyCoverageDays } from '../../src/utils/priceAnalysis';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';

function formatDistance(d: number): string {
  return d < 1 ? `${(d * 1000).toFixed(0)} m` : `${d.toFixed(1)} km`;
}

export default function PriceTrendsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stations, stationDistances } = useApp();

  const { colors } = useThemeTokens();

  const station = useMemo(
    () => stations.find((s) => s.properties.id === id),
    [stations, id]
  );

  const fuels = useMemo(() => {
    if (!station) return [];
    return Object.keys(station.properties.fuels ?? {});
  }, [station]);

  const [selectedFuel, setSelectedFuel] = useState<string | null>(fuels[0] ?? null);
  const { data, loading, enabled } = usePriceHistory(id ?? '', selectedFuel ?? '');

  const unit = fuelUnit(selectedFuel ?? '', station?.properties.source);

  const locationParts = useMemo(
    () => (station ? getLocationParts(station.properties) : []),
    [station]
  );
  const city = locationParts[0];
  const distanceKm = id ? stationDistances.get(id) : undefined;

  const subtitleParts = useMemo(() => {
    const parts: string[] = [];
    if (city) parts.push(city);
    if (distanceKm !== undefined) parts.push(`${formatDistance(distanceKm)} ${t('station.from_location')}`);
    return parts;
  }, [city, distanceKm, t]);

  const coverageDays = useMemo(() => historyCoverageDays(data), [data]);
  const chartForecast = useMemo(() => {
    if (coverageDays < FORECAST_MIN_DAYS) return undefined;
    return forecast(data, FORECAST_HORIZONS[1])?.predicted;
  }, [data, coverageDays]);

  return (
    <>
      <Stack.Screen
        options={{
          title: t('screen.price_history'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.tint,
          headerTitleStyle: { color: colors.label },
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
        <Text className="text-title-3 mb-xs" style={{ color: colors.label }}>
          {station?.properties.brand || station?.properties.name || t('common.station')}
        </Text>
        {subtitleParts.length > 0 && (
          <Text className="text-subheadline mb-lg" style={{ color: colors.secondaryLabel }}>
            {subtitleParts.join(' · ')}
          </Text>
        )}

        {fuels.length > 1 && (
          <View className="flex-row flex-wrap gap-sm mb-lg">
            {fuels.map((fuel) => (
                <TouchableOpacity
                  key={fuel}
                  activeOpacity={0.7}
                  onPress={() => setSelectedFuel(fuel)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: selectedFuel === fuel ? colors.tint : colors.groupedBackground,
                  }}
                >
                  <Text
                    className="text-caption-1 font-semibold"
                    style={{ color: selectedFuel === fuel ? colors.labelOnTint : colors.label }}
                  >
                  {fuelLabel(fuel)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading ? (
          <Text style={{ color: colors.secondaryLabel, textAlign: 'center' }}>
            {t('price_trends.loading')}
          </Text>
        ) : !enabled ? (
          <Text style={{ color: colors.secondaryLabel, textAlign: 'center' }}>
            {t('price_trends.history_disabled')}
          </Text>
        ) : (
          <View className="gap-lg">
            <CheapDayBanner data={data} />
            <PriceStats data={data} unit={unit} />
            <PriceChart
              data={data}
              fuelLabel={fuelLabel(selectedFuel ?? '')}
              fuelKey={selectedFuel ?? undefined}
              source={station?.properties.source}
              forecast={chartForecast}
            />
            <PriceForecast data={data} unit={unit} />
            <WeekdayRadar data={data} />
          </View>
        )}
      </ScrollView>
    </>
  );
}