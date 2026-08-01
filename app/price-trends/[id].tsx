import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { useApp } from '../../src/hooks/useApp';
import { usePriceHistory } from '../../src/hooks/usePriceHistory';
import { PriceChart } from '../../src/components/PriceChart';
import { PriceStats } from '../../src/components/PriceStats';
import { CheapDayBanner } from '../../src/components/CheapDayBanner';
import { PriceForecast } from '../../src/components/PriceForecast';
import { WeekdayRadar } from '../../src/components/WeekdayRadar';
import { WorthTheDrive } from '../../src/components/WorthTheDrive';
import { fuelLabel, fuelUnit } from '../../src/utils/fuelNames';
import { getLocationParts } from '../../src/utils/location';
import { forecast, FORECAST_HORIZONS, FORECAST_MIN_DAYS, historyCoverageDays } from '../../src/utils/priceAnalysis';
import { tokens } from '../../src/theme/tokens';

function formatDistance(d: number): string {
  return d < 1 ? `${(d * 1000).toFixed(0)} m` : `${d.toFixed(1)} km`;
}

export default function PriceTrendsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stations, stationDistances } = useApp();

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = tokens.color[isDark ? 'dark' : 'light'];

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

      {/* Screen Content */}
      <ScrollView className="flex-1 bg-background dark:bg-background-dark" contentContainerStyle={{ padding: 16 }}>
        <Text className="text-title-3 text-label dark:text-label-dark mb-xs">
          {station?.properties.brand || station?.properties.name || t('common.station')}
        </Text>
        {subtitleParts.length > 0 && (
          <Text className="text-subheadline text-secondary-label dark:text-secondary-label-dark mb-lg">
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
                className={`px-3.5 py-1.5 rounded-xl ${
                  selectedFuel === fuel ? 'bg-tint dark:bg-tint-dark' : 'bg-grouped-background dark:bg-grouped-background-dark'
                }`}
              >
                <Text
                  className={`text-caption-1 font-semibold ${
                    selectedFuel === fuel ? 'text-white' : 'text-label dark:text-label-dark'
                  }`}
                >
                  {fuelLabel(fuel)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading ? (
          <Text className="text-secondary-label dark:text-secondary-label-dark text-center">
            {t('price_trends.loading')}
          </Text>
        ) : !enabled ? (
          <Text className="text-secondary-label dark:text-secondary-label-dark text-center">
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
            {station && <WorthTheDrive station={station} distanceKm={distanceKm} fuelType={selectedFuel ?? undefined} />}
          </View>
        )}
      </ScrollView>
    </>
  );
}
