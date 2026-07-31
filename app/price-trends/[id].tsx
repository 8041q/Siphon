import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { useApp } from '../../src/hooks/useApp';
import { usePriceHistory } from '../../src/hooks/usePriceHistory';
import { PriceChart } from '../../src/components/PriceChart';
import { fuelLabel } from '../../src/utils/fuelNames';
import { tokens } from '../../src/theme/tokens';

export default function PriceTrendsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stations } = useApp();
  
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
        <Text className="text-subheadline text-secondary-label dark:text-secondary-label-dark mb-lg">
          {station?.properties.address}
        </Text>

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
          <PriceChart
            data={data}
            fuelLabel={fuelLabel(selectedFuel ?? '')}
            fuelKey={selectedFuel ?? undefined}
            source={station?.properties.source}
          />
        )}
      </ScrollView>
    </>
  );
}