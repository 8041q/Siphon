import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useStationCatalog, useStationDistances, useStationSync } from '../../src/hooks/useApp';
import { usePriceHistory } from '../../src/hooks/usePriceHistory';
import { PriceChart } from '../../src/components/PriceChart';
import { PriceStats } from '../../src/components/PriceStats';
import { CheapDayBanner } from '../../src/components/CheapDayBanner';
import { PriceForecast } from '../../src/components/PriceForecast';
import { WeekdayRadar } from '../../src/components/WeekdayRadar';
import { fuelLabel, fuelUnit } from '../../src/utils/fuelNames';
import { getLocationParts } from '../../src/utils/location';
import {
  forecast,
  FORECAST_HORIZONS,
  FORECAST_MIN_DAYS,
  historyCoverageDays,
} from '../../src/utils/priceAnalysis';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import type { FuelKey } from '../../src/api/siphonClient';

function formatDistance(distanceKm: number): string {
  return distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)} m` : `${distanceKm.toFixed(1)} km`;
}

export default function PriceTrendsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '');
  const { getStationById } = useStationCatalog();
  const { stationDistances } = useStationDistances();
  const {
    loading: stationsLoading,
    error: stationsError,
    offline,
    reload,
  } = useStationSync();
  const { colors } = useThemeTokens();
  const insets = useSafeAreaInsets();

  const station = useMemo(
    () => (id ? getStationById(id) : undefined),
    [getStationById, id],
  );

  const fuels = useMemo(
    () => (station ? (Object.keys(station.properties.fuels) as FuelKey[]) : []),
    [station],
  );

  const [selectedFuel, setSelectedFuel] = useState<FuelKey | null>(null);

  useEffect(() => {
    setSelectedFuel((current) => {
      if (current && fuels.includes(current)) return current;
      return fuels[0] ?? null;
    });
  }, [fuels]);

  const { data, loading, enabled } = usePriceHistory(id, selectedFuel ?? '');
  const unit = fuelUnit(selectedFuel ?? '', station?.properties.source);

  const locationParts = useMemo(
    () => (station ? getLocationParts(station.properties) : []),
    [station],
  );
  const city = locationParts[0];
  const distanceKm = id ? stationDistances.get(id) : undefined;

  const subtitleParts = useMemo(() => {
    const parts: string[] = [];
    if (city) parts.push(city);
    if (distanceKm !== undefined) {
      parts.push(`${formatDistance(distanceKm)} ${t('station.from_location')}`);
    }
    return parts;
  }, [city, distanceKm, t]);

  const coverageDays = useMemo(() => historyCoverageDays(data), [data]);
  const chartForecast = useMemo(() => {
    if (coverageDays < FORECAST_MIN_DAYS) return undefined;
    return forecast(data, FORECAST_HORIZONS[1])?.predicted;
  }, [data, coverageDays]);

  const content = (() => {
    if (stationsLoading && !station) {
      return (
        <Text style={{ color: colors.secondaryLabel, textAlign: 'center', paddingVertical: 24 }}>
          {t('price_trends.loading')}
        </Text>
      );
    }

    if (stationsError && !station) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }} accessibilityLiveRegion="assertive">
          <Text style={{ color: colors.secondaryLabel, textAlign: 'center' }}>
            {t('common.something_went_wrong')}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={reload}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            style={{ backgroundColor: colors.tint, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text style={{ color: colors.labelOnTint, fontWeight: '600' }}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!station) {
      return (
        <Text style={{ color: colors.secondaryLabel, textAlign: 'center', paddingVertical: 24 }}>
          {t('price_trends.station_not_found')}
        </Text>
      );
    }

    if (fuels.length === 0 || !selectedFuel) {
      return (
        <Text style={{ color: colors.secondaryLabel, textAlign: 'center', paddingVertical: 24 }}>
          {t('price_trends.no_fuels')}
        </Text>
      );
    }

    if (loading) {
      return (
        <Text style={{ color: colors.secondaryLabel, textAlign: 'center', paddingVertical: 24 }}>
          {t('price_trends.loading')}
        </Text>
      );
    }

    if (!enabled) {
      return (
        <Text style={{ color: colors.secondaryLabel, textAlign: 'center', paddingVertical: 24 }}>
          {t('price_trends.history_disabled')}
        </Text>
      );
    }

    if (data.length === 0) {
      return (
        <Text style={{ color: colors.secondaryLabel, textAlign: 'center', paddingVertical: 24 }}>
          {t('price_trends.no_history')}
        </Text>
      );
    }

    return (
      <View className="gap-lg">
        <CheapDayBanner data={data} />
        <PriceStats data={data} unit={unit} />
        <PriceChart
          data={data}
          fuelLabel={fuelLabel(selectedFuel)}
          fuelKey={selectedFuel}
          source={station.properties.source}
          forecast={chartForecast}
        />
        <PriceForecast data={data} unit={unit} />
        <WeekdayRadar data={data} />
      </View>
    );
  })();

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

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(16, insets.bottom + 16) }}
      >
        {station && (offline || stationsError) && (
          <View
            style={{ backgroundColor: colors.groupedBackground, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 }}
            accessibilityLiveRegion="polite"
          >
            <Text style={{ color: colors.secondaryLabel, textAlign: 'center' }} className="text-footnote">
              {t('common.using_cached_data')}
            </Text>
          </View>
        )}

        {station && (
          <>
            <Text className="text-title-3 mb-xs" style={{ color: colors.label }}>
              {station.properties.brand || station.properties.name || t('common.station')}
            </Text>
            {subtitleParts.length > 0 && (
              <Text className="text-subheadline mb-lg" style={{ color: colors.secondaryLabel }}>
                {subtitleParts.join(' · ')}
              </Text>
            )}

            {fuels.length > 1 && (
              <View className="flex-row flex-wrap gap-sm mb-lg">
                {fuels.map((fuel) => {
                  const selected = selectedFuel === fuel;
                  return (
                    <TouchableOpacity
                      key={fuel}
                      activeOpacity={0.7}
                      onPress={() => setSelectedFuel(fuel)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={fuelLabel(fuel)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 16,
                        backgroundColor: selected ? colors.tint : colors.groupedBackground,
                      }}
                    >
                      <Text
                        className="text-caption-1 font-semibold"
                        style={{ color: selected ? colors.labelOnTint : colors.label }}
                      >
                        {fuelLabel(fuel)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {content}
      </ScrollView>
    </>
  );
}
