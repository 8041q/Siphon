import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationCard } from '../../src/components/StationCard';
import { useStations, useUI } from '../../src/hooks/useApp';
import { Icon } from '../../src/components/ui/icon';

export default function FavoritesScreen() {
  const { filteredStations } = useStations();
  const { favorites, setSelectedStation, toggleFavorite } = useUI();

  const favoriteStations = filteredStations.filter(
    (station) => favorites?.has(station.properties.id)
  );

  const handleStationPress = useCallback(
    (station: (typeof favoriteStations)[number]) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      {favoriteStations.length === 0 ? (
        <View className="flex-1 justify-center items-center p-xl">
          <Icon name="star.fill" size={48} color="rgba(60, 60, 67, 0.3)" />
          <Text className="text-body text-secondary-label dark:text-secondary-label-dark mt-md">
            No favorites yet
          </Text>
          <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark mt-xs">
            Tap the star on a station to add it here
          </Text>
        </View>
      ) : (
        <FlashList
          data={favoriteStations}
          keyExtractor={(item) => item.properties.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <StationCard
              station={item}
              onPress={handleStationPress}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
