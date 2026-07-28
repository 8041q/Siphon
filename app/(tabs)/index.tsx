import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationDetailSheet } from '../../src/components/StationDetailSheet';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { useApp } from '../../src/hooks/useApp';

export default function MapScreen() {
  const { filteredStations, loading, syncProgress, error, offline, location, setSelectedStation } = useApp();
  const mapRef = useRef<MapView>(null);
  const [regionSet, setRegionSet] = useState(false);

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
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onLayout={() => {
          if (!regionSet) {
            mapRef.current?.animateToRegion(initialRegion, 500);
            setRegionSet(true);
          }
        }}
        showsUserLocation
        showsMyLocationButton
        showsCompass
      >
        {filteredStations.map((station) => {
          const [lng, lat] = station.geometry.coordinates;
          const title = station.properties.brand || station.properties.name || '';
          return (
            <Marker
              key={station.properties.id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={title}
              description={station.properties.address}
              onPress={() => onMarkerPress(station)}
              tracksViewChanges={false}
            />
          );
        })}
      </MapView>

      <StationDetailSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  error: { color: '#c00', textAlign: 'center' },
  map: { flex: 1 },
  offlineBanner: { backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 16 },
  offlineText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
  locationBanner: { backgroundColor: '#e0f2fe', paddingVertical: 6, paddingHorizontal: 16 },
  locationText: { color: '#075985', fontSize: 13, textAlign: 'center' },
});
