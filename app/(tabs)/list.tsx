import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';

import { StationCard } from '../../src/components/StationCard';
import { StationDetailSheet } from '../../src/components/StationDetailSheet';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { useStations, useUI, useLocationState } from '../../src/hooks/useApp';

export default function ListScreen() {
  const { filteredStations, loading, syncProgress, error, offline } = useStations();
  const { location, requestingLocation } = useLocationState();
  const { selectedStation, setSelectedStation } = useUI();

  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showLocationBanner, setShowLocationBanner] = useState(false);

  const handleStationPress = useCallback(
    (station: (typeof filteredStations)[number]) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );

  // Auto-dismiss banners after 5 seconds
  useEffect(() => {
    if (offline) {
      setShowOfflineBanner(true);
      const timer = setTimeout(() => setShowOfflineBanner(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineBanner(false);
    }
  }, [offline]);

  useEffect(() => {
    if (location.approximate && !requestingLocation) {
      setShowLocationBanner(true);
      const timer = setTimeout(() => setShowLocationBanner(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowLocationBanner(false);
    }
  }, [location.approximate, requestingLocation]);

  if (loading) return <SyncOverlay message={syncProgress} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {showOfflineBanner && (
        <View style={styles.bannerContainer}>
          <View style={styles.offlineBanner} pointerEvents="box-none">
            <Text style={styles.offlineText}>Using cached data — no connection</Text>
          </View>
        </View>
      )}
      {showLocationBanner && (
        <View style={styles.bannerContainer}>
          <View style={styles.locationBanner} pointerEvents="box-none">
            <Text style={styles.locationText}>Approximate location — enable GPS for better accuracy</Text>
          </View>
        </View>
      )}
      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <FlashList
          data={filteredStations}
          keyExtractor={(item) => item.properties.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <StationCard
              station={item}
              onPress={handleStationPress}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.dim}>No stations found nearby.</Text>
          }
        />
      )}
      <StationDetailSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { padding: 16, gap: 12 },
  dim: { color: '#888', textAlign: 'center', marginTop: 32 },
  error: { color: '#c00', textAlign: 'center' },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 0,
  },
  offlineBanner: { backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 16 },
  offlineText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
  locationBanner: { backgroundColor: '#e0f2fe', paddingVertical: 6, paddingHorizontal: 16 },
  locationText: { color: '#075985', fontSize: 13, textAlign: 'center' },
});
