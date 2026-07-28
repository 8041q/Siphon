import { router } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import type { FuelStationFeature } from '../api/siphonClient';
import { fuelLabel } from '../utils/fuelNames';
import { useUI } from '../hooks/useApp';
import { tokens } from '../theme';
import { BottomSheet } from '@expo/ui';

function DetailContent({ station, onClose }: { station: FuelStationFeature; onClose: () => void }) {
  const colorScheme = useColorScheme();
  const { name, brand, address, fuels } = station.properties;
  const entries = Object.entries(fuels ?? {}) as [string, number][];
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  const t = tokens.typography;
  const r = tokens.radius;
  const s = tokens.spacing;

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ gap: s.sm, padding: s.lg }}>
        <Text style={{ fontSize: t.title3.size, fontWeight: t.title3.weight, color: colors.label }}>
          {brand || name || 'Unknown station'}
        </Text>
        <Text style={{ fontSize: t.subheadline.size, color: colors.secondaryLabel }}>{address}</Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: s.sm,
            marginTop: s.sm,
          }}
        >
          {entries.map(([fuel, price]) => (
            <View
              key={fuel}
              style={{
                backgroundColor: colors.surface,
                borderRadius: r.sm,
                paddingHorizontal: s.sm,
                paddingVertical: s.xs,
              }}
            >
              <Text style={{ fontSize: t.footnote.size, color: colors.secondaryLabel }}>
                {fuelLabel(fuel)}: {price.toFixed(3)}€
              </Text>
            </View>
          ))}
        </View>

        {entries.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              router.push(`/price-trends/${station.properties.id}`);
            }}
            style={{
              marginTop: s.lg,
              backgroundColor: colors.tint,
              borderRadius: r.md,
              paddingVertical: s.md,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: t.callout.size }}>
              View Price History
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

export function StationDetailSheet() {
  const { selectedStation, setSelectedStation } = useUI();

  return (
    <BottomSheet
      isPresented={!!selectedStation}
      onDismiss={() => setSelectedStation(null)}
      snapPoints={['half', 'full']}
      showDragIndicator
    >
      <View style={{ flex: 1 }}>
        {selectedStation ? (
          <DetailContent station={selectedStation} onClose={() => setSelectedStation(null)} />
        ) : null}
      </View>
    </BottomSheet>
  );
}