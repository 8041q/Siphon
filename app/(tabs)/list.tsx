import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';

import { StationCard } from '../../src/components/StationCard';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { useStations, useUI } from '../../src/hooks/useApp';
import { tokens } from '../../src/theme/tokens';

export default function ListScreen() {
  const colorScheme = useColorScheme();
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  const s = tokens.spacing;
  const t = tokens.typography;

  const { filteredStations, loading, syncProgress, error, offline } = useStations();
  const { selectedStation, setSelectedStation } = useUI();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {showOfflineBanner && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <View style={{ backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: 16 }} pointerEvents="box-none">
            <Text style={{ color: colors.secondaryLabel, fontSize: t.footnote.size, textAlign: 'center' }}>
              Using cached data — no connection
            </Text>
          </View>
        </View>
      )}
      {error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: colors.destructive, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (
        <FlashList
          data={filteredStations}
          keyExtractor={(item) => item.properties.id}
          contentContainerStyle={{ padding: s.lg, gap: s.md }}
          renderItem={({ item }) => (
            <StationCard
              station={item}
              onPress={handleStationPress}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.secondaryLabel, textAlign: 'center', marginTop: s.xxxl }}>
              No stations found nearby.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}