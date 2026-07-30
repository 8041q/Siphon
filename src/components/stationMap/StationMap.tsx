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
            const center = (event.nativeEvent as any).center;
            let lng: number;
            let lat: number;
            if (Array.isArray(center)) {
              lng = center[0];
              lat = center[1];
            } else if (center && typeof center === 'object') {
              lng = center.longitude ?? center[0];
              lat = center.latitude ?? center[1];
            } else {
              return;
            }
            if (!isFinite(lat) || !isFinite(lng)) return;

            const rawBounds = (event.nativeEvent as any).bounds;
            let bounds: [number, number, number, number] | undefined;
            if (Array.isArray(rawBounds)) {
              if (Array.isArray(rawBounds[0]) && rawBounds.length === 2) {
                bounds = [rawBounds[0][0], rawBounds[0][1], rawBounds[1][0], rawBounds[1][1]];
              } else if (rawBounds.length === 4) {
                bounds = [rawBounds[0], rawBounds[1], rawBounds[2], rawBounds[3]];
              }
            }
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
