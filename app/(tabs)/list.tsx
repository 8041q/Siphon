import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';

import { StationCard } from '../../src/components/StationCard';
import { StationDetailSheet } from '../../src/components/StationDetailSheet';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { useApp } from '../../src/hooks/useApp';

export default function ListScreen() {
  const { filteredStations, loading, syncProgress, error, offline, location, setSelectedStation } = useApp();

  const handleStationPress = useCallback(
    (station: (typeof filteredStations)[number]) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );

  if (loading) return <SyncOverlay message={syncProgress} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Using cached data — no connection</Text>
        </View>
      )}
      {location.approximate && (
        <View style={styles.locationBanner}>
          <Text style={styles.locationText}>Approximate location — enable GPS for better accuracy</Text>
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
  offlineBanner: { backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 16 },
  offlineText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
  locationBanner: { backgroundColor: '#e0f2fe', paddingVertical: 6, paddingHorizontal: 16 },
  locationText: { color: '#075985', fontSize: 13, textAlign: 'center' },
});
