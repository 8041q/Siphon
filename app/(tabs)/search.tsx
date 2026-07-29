import { useCallback, useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/ui/icon';
import { StationCard } from '../../src/components/StationCard';
import { useStations, useUI } from '../../src/hooks/useApp';
import type { FuelStationFeature } from '../../src/api/siphonClient';

export default function SearchScreen() {
  const { stations } = useStations();
  const { setSelectedStation, favorites, toggleFavorite } = useUI();
  const colorScheme = useColorScheme();

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

  const secondaryLabel = colorScheme === 'dark' ? 'rgba(235, 235, 245, 0.6)' : 'rgba(60, 60, 67, 0.6)';

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <View className="flex-1">
        {/* Added px-4 so SearchBar inset matches the list */}
        <View className="px-4">
          <SearchBar brandQuery={brandQuery} setBrandQuery={setBrandQuery} secondaryLabel={secondaryLabel} />
        </View>
        <StationList results={results} handleStationPress={handleStationPress} favorites={favorites} onToggleFavorite={toggleFavorite} />
      </View>
    </SafeAreaView>
  );
}

function SearchBar({ brandQuery, setBrandQuery, secondaryLabel }: { brandQuery: string; setBrandQuery: (q: string) => void; secondaryLabel: string }) {
  return (
    <View className="flex-row items-center bg-grouped-background dark:bg-grouped-background-dark rounded-md mb-lg px-3 py-2">
      <Icon name="magnifyingglass" size={17} color={secondaryLabel} />
      <TextInput
        value={brandQuery}
        onChangeText={setBrandQuery}
        placeholder="Search stations..."
        placeholderTextColor={secondaryLabel}
        className="flex-1 ml-2 text-label dark:text-label-dark"
      />
    </View>
  );
}

function StationList({ results, handleStationPress, favorites, onToggleFavorite }: { results: FuelStationFeature[]; handleStationPress: (station: FuelStationFeature) => void; favorites?: Set<string>; onToggleFavorite?: (station: FuelStationFeature) => void }) {
  if (!results || results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-title-3 text-secondary-label dark:text-secondary-label-dark">
          No stations found
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Added px-4 to match the horizontal layout */}
      <Text className="text-headline text-label dark:text-label-dark mb-sm px-4">
        Search Results
      </Text>
      <FlashList
        data={results}
        keyExtractor={(item) => item.properties.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <StationCard station={item} onPress={handleStationPress} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        )}
      />
    </View>
  );
}