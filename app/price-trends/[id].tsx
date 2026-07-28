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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#888' }}>Station not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
        {station.properties.brand || station.properties.name || 'Station'}
      </Text>
      <Text style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
        {station.properties.address}
      </Text>

      {fuels.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {fuels.map((fuel) => (
            <TouchableOpacity
              key={fuel}
              activeOpacity={0.7}
              onPress={() => setSelectedFuel(fuel)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: selectedFuel === fuel ? '#2563eb' : '#f4f4f5',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: selectedFuel === fuel ? '#fff' : '#333',
                }}
              >
                {fuelLabel(fuel)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <Text style={{ color: '#888', textAlign: 'center' }}>Loading price history…</Text>
      ) : (
        <PriceChart data={data} fuelLabel={fuelLabel(selectedFuel ?? '')} />
      )}
    </ScrollView>
  );
}
