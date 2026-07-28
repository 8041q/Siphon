import { router } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import type { FuelStationFeature } from '../api/siphonClient';
import { useUI } from '../hooks/useApp';
import { fuelLabel } from '../utils/fuelNames';
import { BottomSheet } from '@expo/ui';

export function StationDetailSheet() {
  const { selectedStation, setSelectedStation } = useUI();
  const station = selectedStation;
  if (!station) return null;

  const { name, brand, address, fuels } = station.properties;
  const entries = Object.entries(fuels ?? {});

  return (
    <BottomSheet
      isPresented={!!station}
      onDismiss={() => setSelectedStation(null)}
      snapPoints={['half', 'full']}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>
            {brand || name || 'Unknown station'}
          </Text>
          <Text style={{ fontSize: 14, color: '#555' }}>{address}</Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 8,
            }}
          >
            {entries.map(([fuel, price]) => (
              <View
                key={fuel}
                style={{
                  backgroundColor: '#e5e7eb',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600' }}>
                  {fuelLabel(fuel)}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#166534' }}>
                  {Number(price).toFixed(3)} €
                </Text>
              </View>
            ))}
          </View>

          {entries.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setSelectedStation(null);
                router.push(`/price-trends/${station.properties.id}`);
              }}
              style={{
                marginTop: 16,
                backgroundColor: '#2563eb',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                View Price History
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
