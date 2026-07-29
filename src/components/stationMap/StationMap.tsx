import { memo, useEffect, useMemo, useRef } from 'react';
import { View, useColorScheme } from 'react-native';
import { Map, Camera, UserLocation, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';

import type { StationMapProps } from './types';
import { tokens } from '../../theme/tokens';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function StationMapComponent({ initialRegion, stations, onMarkerPress, onRegionChange, flyToCoords }: StationMapProps) {
  const colorScheme = useColorScheme();
  const tint = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'].tint;
  const cameraRef = useRef<CameraRef>(null);

  useEffect(() => {
    if (flyToCoords) {
      cameraRef.current?.flyTo({ center: flyToCoords, duration: 500 });
    }
  }, [flyToCoords]);

  const markers = useMemo(() => stations.map((station) => {
    const [lng, lat] = station.geometry.coordinates;
    return (
      <Marker
        key={station.properties.id}
        id={station.properties.id}
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
      </Marker>
    );
  }), [stations, tint]);

  return (
    <Map
        style={{ flex: 1 }}
        mapStyle={OPENFREEMAP_STYLE}
        compass
        logo={false}
        touchZoom
        doubleTapZoom
        onRegionDidChange={(event) => {
          if (onRegionChange) {
            const [lng, lat] = event.nativeEvent.center;
            const bounds = (event.nativeEvent as any).bounds as [number, number, number, number] | undefined;
            onRegionChange(lat, lng, bounds);
          }
        }}
    >
      <Camera
        ref={cameraRef}
        center={[initialRegion.longitude, initialRegion.latitude]}
        zoom={12}
      />
      <UserLocation animated />
      {markers}
      </Map>
  );
}

export const StationMap = memo(StationMapComponent);
