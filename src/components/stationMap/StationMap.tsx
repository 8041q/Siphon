import { Platform, StyleSheet, View } from 'react-native';
import { Map, Camera, UserLocation, Marker as MapLibreMarker } from '@maplibre/maplibre-react-native';
import MapView, { Marker as AppleMarker } from 'react-native-maps';

import type { StationMapProps } from './types';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function StationMapAndroid({ initialRegion, stations, onMarkerPress, onRegionChange }: StationMapProps) {
  return (
    <Map
      style={styles.map}
      mapStyle={OPENFREEMAP_STYLE}
      compass
      logo={false}
      onRegionDidChange={(event) => {
        if (onRegionChange) {
          const [lng, lat] = event.nativeEvent.center;
          onRegionChange(lat, lng);
        }
      }}
    >
      <Camera
        center={[initialRegion.longitude, initialRegion.latitude]}
        zoom={12}
      />
      <UserLocation animated />
      {stations.map((station) => {
        const [lng, lat] = station.geometry.coordinates;
        return (
          <MapLibreMarker
            key={station.properties.id}
            lngLat={[lng, lat]}
            anchor="bottom"
            onPress={() => onMarkerPress(station)}
          >
            <View style={styles.markerPin}>
              <View style={styles.markerDot} />
            </View>
          </MapLibreMarker>
        );
      })}
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
      {stations.map((station) => {
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
          />
        );
      })}
    </MapView>
  );
}

export const StationMap = Platform.OS === 'ios' ? StationMapIOS : StationMapAndroid;

const styles = StyleSheet.create({
  map: { flex: 1 },
  markerPin: {
    width: 28,
    height: 36,
    alignItems: 'center',
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
