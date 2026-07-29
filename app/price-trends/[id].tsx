import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useApp } from '../../src/hooks/useApp';
import { usePriceHistory } from '../../src/hooks/usePriceHistory';
import { PriceChart } from '../../src/components/PriceChart';
import { fuelLabel } from '../../src/utils/fuelNames';

export default function PriceTrendsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stations } = useApp();

  const station = useMemo(
    () => stations.find((s) => s.properties.id === id),
    [stations, id]
  );

  const fuels = useMemo(() => {
    if (!station) return [];
    return Object.keys(station.properties.fuels ?? {});
  }, [station]);

  const [selectedFuel, setSelectedFuel] = useState<string | null>(fuels[0] ?? null);
  const { data, loading } = usePriceHistory(id ?? '', selectedFuel ?? '');

  if (!station) {
    return (
      <View className="flex-1 justify-center items-center p-xl">
        <Text className="text-secondary-label dark:text-secondary-label-dark">Station not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background dark:bg-background-dark" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-title-3 mb-xs">
        {station.properties.brand || station.properties.name || 'Station'}
      </Text>
      <Text className="text-subheadline text-secondary-label dark:text-secondary-label-dark mb-lg">
        {station.properties.address}
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
          Loading price history…
        </Text>
      ) : (
        <PriceChart data={data} fuelLabel={fuelLabel(selectedFuel ?? '')} />
      )}
    </ScrollView>
  );
}
