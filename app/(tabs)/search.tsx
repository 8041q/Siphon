import { useCallback, useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '../../src/theme/tokens';
import { Icon } from '../../src/theme/Icon';
import { StationCard } from '../../src/components/StationCard';
import { useStations, useUI } from '../../src/hooks/useApp';
import type { FuelStationFeature } from '../../src/api/siphonClient';

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const { stations } = useStations();
  const { setSelectedStation } = useUI();
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  const s = tokens.spacing;

  const handleStationPress = useCallback(
    (station: FuelStationFeature) => {
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
      filtered = filtered.filter((s) => selectedFuel in s.properties.fuels);
    }
    return filtered;
  }, [brandQuery, selectedFuel, stations]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: s.xl, paddingVertical: s.xl }}>
        <SearchBar
          brandQuery={brandQuery}
          setBrandQuery={setBrandQuery}
          colors={colors}
        />
        <StationList
          results={results}
          handleStationPress={handleStationPress}
        />
      </View>
    </SafeAreaView>
  );
}

function SearchBar({ brandQuery, setBrandQuery, colors }: { brandQuery: string; setBrandQuery: (q: string) => void; colors: typeof tokens.color.light }) {
  const r = tokens.radius;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.groupedBackground,
        borderRadius: r.md,
        marginBottom: 16,
        marginTop: -16,
        marginHorizontal: 4,
      }}
    >
      <View style={{ paddingHorizontal: 4 }}>
        <Icon sf="magnifyingglass" md="search" size={17} color={colors.secondaryLabel} />
      </View>
      <TextInput
        value={brandQuery}
        onChangeText={setBrandQuery}
        placeholder="Search stations..."
        placeholderTextColor={colors.tertiaryLabel}
        style={{ flex: 1, paddingHorizontal: 4 }}
      />
    </View>
  );
}

function StationList({ results, handleStationPress }: { results: FuelStationFeature[]; handleStationPress: (station: FuelStationFeature) => void }) {
  const colorScheme = useColorScheme();
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  const t = tokens.typography;
  const s = tokens.spacing;

  if (!results || results.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Text style={{ fontSize: t.title3.size, fontWeight: t.title3.weight, color: colors.secondaryLabel }}>
          No stations found
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: t.headline.size, fontWeight: t.headline.weight, color: colors.label, marginBottom: s.sm }}>
        Search Results
      </Text>
      <FlashList
        data={results}
        renderItem={({ item }) => (
          <StationCard station={item} onPress={handleStationPress} />
        )}
      />
    </View>
  );
}