import { memo, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { Map, Camera, UserLocation, Marker as MapLibreMarker } from '@maplibre/maplibre-react-native';
import MapView, { Marker as AppleMarker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'react-native';

import type { StationMapProps } from './types';
import type { FuelStationFeature } from '../../api/siphonClient';
import { tokens } from '../../theme/tokens';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function StationMapAndroid({ initialRegion, stations, onMarkerPress, onRegionChange }: StationMapProps) {
  const colorScheme = useColorScheme();
  const tint = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'].tint;

  return (
    <Map
      style={{ flex: 1 }}
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
      {useMemo(() => stations.map((station) => {
        const [lng, lat] = station.geometry.coordinates;
        return (
          <MapLibreMarker
            key={station.properties.id}
            lngLat={[lng, lat]}
            anchor="center"
            offset={[0, 0]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onMarkerPress(station);
            }}
          >
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: tint, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.5)' }} />
            </View>
          </MapLibreMarker>
        );
      }), [stations, tint])}
    </Map>
  );
}

function StationMapIOS({ initialRegion, stations, onMarkerPress, onRegionChange }: StationMapProps) {
  return (
    <MapView
      style={{ flex: 1 }}
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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onMarkerPress(station);
            }}
            tracksViewChanges={false}
            centerOffset={{ x: 0, y: 0 }}
            calloutAnchor={{ x: 0.5, y: 0.5 }}
          />
        );
      }), [stations])}
    </MapView>
  );
}

export const StationMap = memo(Platform.OS === 'ios' ? StationMapIOS : StationMapAndroid);