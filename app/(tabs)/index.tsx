import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationMap } from '../../src/components/stationMap/StationMap';
import { StationDetailSheet } from '../../src/components/StationDetailSheet';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { useStations, useUI, useLocationState, useActions } from '../../src/hooks/useApp';

export default function MapScreen() {
  const { filteredStations, loading, syncProgress, error, offline } = useStations();
  const { location, requestingLocation } = useLocationState();
  const { setSelectedStation } = useUI();
  const { loadStationsForRegion } = useActions();

  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showLocationBanner, setShowLocationBanner] = useState(false);

  const onMarkerPress = useCallback(
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
      <StationMap
        initialRegion={initialRegion}
        stations={filteredStations}
        onMarkerPress={onMarkerPress}
        onRegionChange={loadStationsForRegion}
      />

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
            <Text style={styles.locationText}>Approximate location</Text>
          </View>
        </View>
      )}

      <StationDetailSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#c00', textAlign: 'center' },
  bannerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 0 },
  offlineBanner: { backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 16 },
  offlineText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
  locationBanner: { backgroundColor: '#e0f2fe', paddingVertical: 6, paddingHorizontal: 16 },
  locationText: { color: '#075985', fontSize: 13, textAlign: 'center' },
});
