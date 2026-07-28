import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationMap } from '../../src/components/stationMap/StationMap';
import { StationDetailSheet } from '../../src/components/StationDetailSheet';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { useApp } from '../../src/hooks/useApp';

export default function MapScreen() {
  const { filteredStations, loading, syncProgress, error, offline, location, setSelectedStation, loadStationsForRegion } = useApp();

  const onMarkerPress = useCallback(
    (station: (typeof filteredStations)[number]) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );

  if (loading) return <SyncOverlay message={syncProgress} />;

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  const initialRegion = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Using cached data — no connection</Text>
        </View>
      )}
      {location.approximate && (
        <View style={styles.locationBanner}>
          <Text style={styles.locationText}>Approximate location</Text>
        </View>
      )}
      <StationMap
        initialRegion={initialRegion}
        stations={filteredStations}
        onMarkerPress={onMarkerPress}
        onRegionChange={loadStationsForRegion}
      />

      <StationDetailSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  error: { color: '#c00', textAlign: 'center' },
  offlineBanner: { backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 16 },
  offlineText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
  locationBanner: { backgroundColor: '#e0f2fe', paddingVertical: 6, paddingHorizontal: 16 },
  locationText: { color: '#075985', fontSize: 13, textAlign: 'center' },
});
