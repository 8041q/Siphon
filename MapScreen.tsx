// MapScreen.tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { geoClient } from './GeoJsonClient';
import { registerBackgroundFetch } from './backgroundTask';

interface GeoJsonPointFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [Longitude, Latitude]
  };
  properties: {
    id?: string | number;
    title?: string;
    description?: string;
    [key: string]: any;
  };
}

export default function MapScreen() {
  const [geoData, setGeoData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Setup background fetching on mount
    registerBackgroundFetch();

    // 2. Fetch GeoJSON data (checks cache first, then conditional HTTP GET)
    async function loadGeoData() {
      try {
        const data = await geoClient.checkForUpdates('data/locations.geojson');
        setGeoData(data);
      } catch (err) {
        console.error('Failed loading map data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadGeoData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading Map Data...</Text>
      </View>
    );
  }

  // Filter out Point features from the GeoJSON FeatureCollection
  const pointFeatures: GeoJsonPointFeature[] =
    geoData?.features?.filter(
      (feature: any) => feature.geometry?.type === 'Point'
    ) || [];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* Render GeoJSON Point features directly */}
        {pointFeatures.map((feature, index) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          const key = feature.properties?.id || index;

          return (
            <Marker
              key={key}
              coordinate={{ latitude, longitude }}
              title={feature.properties?.title || 'Location'}
              description={feature.properties?.description}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});