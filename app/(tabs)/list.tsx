import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { StationCard } from '../../src/components/StationCard';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { useStations, useUI } from '../../src/hooks/useApp';

export default function ListScreen() {
  const { filteredStations, loading, syncProgress, error, offline } = useStations();
  const { setSelectedStation } = useUI();
  const { favorites, toggleFavorite } = useUI();

  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  const handleStationPress = useCallback(
    (station: (typeof filteredStations)[number]) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );

  useEffect(() => {
    if (offline) {
      setShowOfflineBanner(true);
      const timer = setTimeout(() => setShowOfflineBanner(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineBanner(false);
    }
  }, [offline]);

  if (loading) return <SyncOverlay message={syncProgress} />;

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top', 'bottom']}>
      {showOfflineBanner && (
        <View className="absolute top-0 left-0 right-0 z-10">
          <View className="bg-surface dark:bg-surface-dark py-1.5 px-lg" pointerEvents="box-none">
            <Text className="text-secondary-label dark:text-secondary-label-dark text-footnote text-center">
              Using cached data — no connection
            </Text>
          </View>
        </View>
      )}
      {error ? (
        <View className="flex-1 justify-center items-center p-xl">
          <Text className="text-destructive dark:text-destructive-dark text-center">{error}</Text>
        </View>
      ) : (
        <FlashList
          data={filteredStations}
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
          ListEmptyComponent={
            <Text className="text-secondary-label dark:text-secondary-label-dark text-center mt-xxxl">
              No stations found nearby.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
