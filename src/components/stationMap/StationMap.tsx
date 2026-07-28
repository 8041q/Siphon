import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Map, Camera, Marker as MapLibreMarker, LogManager } from '@maplibre/maplibre-react-native';
import type { MapRef } from '@maplibre/maplibre-react-native';
import MapView, { Marker as AppleMarker } from 'react-native-maps';

import type { StationMapProps } from './types';


LogManager.onLog((event) => {
  if (event.message.includes('latLngForPixel')) return true;
  return false;
});

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function StationMapAndroid({ initialRegion, stations, onMarkerPress, onRegionChange }: StationMapProps) {
  const mapRef = useRef<MapRef>(null);
  const isDestroyed = useRef(false);

  useEffect(() => {
    return () => {
      isDestroyed.current = true;
    };
  }, []);

  const handleRegionChange = useCallback(
    (event: { nativeEvent: { center: [number, number] } }) => {
      if (isDestroyed.current) return;
      if (onRegionChange) {
        const [lng, lat] = event.nativeEvent.center;
        onRegionChange(lat, lng);
      }
    },
    [onRegionChange],
  );

  const markers = useMemo(
    () =>
      stations.map((station) => {
        const [lng, lat] = station.geometry.coordinates;
        return (
          <MapLibreMarker
            key={station.properties.id}
            lngLat={[lng, lat]}
            anchor="center"
            offset={[0, 0]}
            onPress={() => onMarkerPress(station)}
          >
            <View style={styles.markerPin}>
              <View style={styles.markerDot} />
            </View>
          </MapLibreMarker>
        );
      }),
    [stations, onMarkerPress],
  );

  return (
    <Map
      ref={mapRef}
      style={styles.map}
      mapStyle={OPENFREEMAP_STYLE}
      compass
      logo={false}
      onRegionDidChange={handleRegionChange}
    >
      <Camera
        center={[initialRegion.longitude, initialRegion.latitude]}
        zoom={12}
      />
      {markers}
    </Map>
  );
}

function StationMapIOS({ initialRegion, stations, onMarkerPress, onRegionChange }: StationMapProps) {
  return (
    <MapView
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton
      showsCompass
      onRegionChangeComplete={(region) => {
        if (onRegionChange) {
          onRegionChange(region.latitude, region.longitude);
        }
      }}
    >
      {useMemo(() => stations.map((station) => {
        const [lng, lat] = station.geometry.coordinates;
        const title = station.properties.brand || station.properties.name || '';
        return (
          <AppleMarker
            key={station.properties.id}
            coordinate={{ latitude: lat, longitude: lng }}
            title={title}
            description={station.properties.address}
            onPress={() => onMarkerPress(station)}
            tracksViewChanges={false}
            // Fix iOS marker positioning
            centerOffset={{ x: 0, y: 0 }}
            calloutAnchor={{ x: 0.5, y: 0.5 }}
          />
        );
      }), [stations])}
    </MapView>
  );
}

export const StationMap = memo(Platform.OS === 'ios' ? StationMapIOS : StationMapAndroid);

const styles = StyleSheet.create({
  map: { flex: 1 },
  markerPin: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#c0392b',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});
