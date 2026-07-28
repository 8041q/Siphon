import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';

import { StationCard } from '../../src/components/StationCard';
import { StationDetailSheet } from '../../src/components/StationDetailSheet';
import { useStations, useUI } from '../../src/hooks/useApp';
import { FUEL_LABELS } from '../../src/utils/fuelNames';

export default function SearchScreen() {
  const { stations } = useStations();
  const { setSelectedStation } = useUI();

  const handleStationPress = useCallback(
    (station: (typeof stations)[number]) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );
  const [brandQuery, setBrandQuery] = useState('');
  const [selectedFuel, setSelectedFuel] = useState<string | null>(null);

  const results = useMemo(() => {
    let filtered = stations;
    if (brandQuery.trim()) {
      const q = brandQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.properties.brand ?? '').toLowerCase().includes(q) ||
          (s.properties.name ?? '').toLowerCase().includes(q)
      );
    }
    if (selectedFuel) {
      filtered = filtered.filter((s) => selectedFuel in (s.properties.fuels ?? {}));
    }
    return filtered;
  }, [stations, brandQuery, selectedFuel]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    stations.forEach((s) => {
      if (s.properties.brand) brands.add(s.properties.brand);
    });
    return [...brands].sort();
  }, [stations]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TextInput
        style={styles.input}
        placeholder="Search by brand or station name…"
        placeholderTextColor="#999"
        value={brandQuery}
        onChangeText={setBrandQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <View style={styles.fuelRow}>
        {Object.keys(FUEL_LABELS).map((fuel) => (
          <TouchableOpacity
            key={fuel}
            activeOpacity={0.7}
            onPress={() => setSelectedFuel(selectedFuel === fuel ? null : fuel)}
            style={[
              styles.fuelChip,
              selectedFuel === fuel && styles.fuelChipActive,
            ]}
          >
            <Text
              style={[
                styles.fuelChipText,
                selectedFuel === fuel && styles.fuelChipTextActive,
              ]}
            >
              {FUEL_LABELS[fuel]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {brandQuery === '' && !selectedFuel && (
        <View style={styles.hintContainer}>
          <Text style={styles.hint}>Type a brand name or select a fuel type to filter</Text>
          <View style={styles.brandList}>
            <Text style={styles.sectionTitle}>Available brands</Text>
            {uniqueBrands.map((brand) => (
              <TouchableOpacity
                key={brand}
                onPress={() => setBrandQuery(brand)}
              >
                <Text style={styles.brandItem}>{brand}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {(brandQuery !== '' || selectedFuel) && (
        <FlashList
          data={results}
          keyExtractor={(item) => item.properties.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <StationCard station={item} onPress={handleStationPress} />
          )}
          ListEmptyComponent={
            <Text style={styles.dim}>No stations match your filter.</Text>
          }
        />
      )}

      <StationDetailSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  input: {
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    fontSize: 15,
  },
  fuelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  fuelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f4f4f5',
  },
  fuelChipActive: {
    backgroundColor: '#2563eb',
  },
  fuelChipText: {
    fontSize: 13,
    color: '#333',
  },
  fuelChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  hintContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  hint: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  },
  brandList: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  brandItem: {
    fontSize: 15,
    color: '#2563eb',
    paddingVertical: 6,
  },
  list: { padding: 16, gap: 12 },
  dim: { color: '#888', textAlign: 'center', marginTop: 32 },
});
