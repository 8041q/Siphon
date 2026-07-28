import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { useApp } from '../../src/hooks/useApp';
import { usePriceHistory } from '../../src/hooks/usePriceHistory';
import { PriceChart } from '../../src/components/PriceChart';
import { fuelLabel } from '../../src/utils/fuelNames';
import { tokens } from '../../src/theme/tokens';

export default function PriceTrendsScreen() {
  const colorScheme = useColorScheme();
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  const s = tokens.spacing;
  const t = tokens.typography;
  const r = tokens.radius;

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
        <Text style={{ color: colors.secondaryLabel }}>Station not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: s.lg }}>
      <Text style={{ fontSize: t.title3.size, fontWeight: t.title3.weight, color: colors.label, marginBottom: s.xs }}>
        {station.properties.brand || station.properties.name || 'Station'}
      </Text>
      <Text style={{ fontSize: t.subheadline.size, color: colors.secondaryLabel, marginBottom: s.lg }}>
        {station.properties.address}
      </Text>

      {fuels.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginBottom: s.lg }}>
          {fuels.map((fuel) => (
            <TouchableOpacity
              key={fuel}
              activeOpacity={0.7}
              onPress={() => setSelectedFuel(fuel)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: r.xl,
                backgroundColor: selectedFuel === fuel ? colors.tint : colors.groupedBackground,
              }}
            >
              <Text
                style={{
                  fontSize: t.caption1.size,
                  fontWeight: '600',
                  color: selectedFuel === fuel ? '#fff' : colors.label,
                }}
              >
                {fuelLabel(fuel)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <Text style={{ color: colors.secondaryLabel, textAlign: 'center' }}>Loading price history…</Text>
      ) : (
        <PriceChart data={data} fuelLabel={fuelLabel(selectedFuel ?? '')} />
      )}
    </ScrollView>
  );
}