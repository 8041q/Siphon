import { memo, useEffect, useMemo, useRef } from 'react';
import { Image, View } from 'react-native';
import { Map, Camera, Marker, GeoJSONSource, Layer, Images, type CameraRef} from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '../../theme/Icon';

import type { StationMapProps } from './types';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useUserLocationMarker } from '../../hooks/useUserLocationMarker';
import { svgMarkers } from '../userLocationMarkers';
import { BRAND_ICONS, BRAND_LOGO_IMAGES, MARKER_SHAPE_ICON, buildLogoImageExpression } from './brandIcons';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Below this zoom we fall back to the lightweight circle dots so the whole
// country is never rendered as individual markers.
export const STATION_MARKER_MIN_ZOOM = 12;

function StationMapComponent({ initialRegion, stations, onMarkerPress, onRegionChange, onMapReady, flyToCoords, userLocation }: StationMapProps) {
  const { colors } = useThemeTokens();
  const cameraRef = useRef<CameraRef>(null);
  const { marker: markerConfig } = useUserLocationMarker();
  const onMapReadyFired = useRef(false);
  const isMounted = useRef(true);
  const pendingFlyToRef = useRef<[number, number] | null>(null);

  // Stable camera center — written once on first render so the native map never
  // receives a mid-init reposition via the Camera prop. All subsequent moves
  // go through cameraRef.flyTo(), which is already deferred until map ready.
  const stableCameraCenter = useRef<[number, number]>([initialRegion.longitude, initialRegion.latitude]);
  if (!Number.isFinite(stableCameraCenter.current[0]) || !Number.isFinite(stableCameraCenter.current[1])) {
    stableCameraCenter.current = [initialRegion.longitude, initialRegion.latitude];
  }

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!flyToCoords || !isMounted.current) return;

    if (onMapReadyFired.current) {
      cameraRef.current?.flyTo({ center: flyToCoords, duration: 500 });
    } else {
      pendingFlyToRef.current = flyToCoords;
    }
  }, [flyToCoords]);

  const handleMapFullyRendered = () => {
    if (onMapReadyFired.current) return;
    onMapReadyFired.current = true;
    onMapReady?.();
    const pending = pendingFlyToRef.current;
    if (pending) {
      pendingFlyToRef.current = null;
      cameraRef.current?.flyTo({ center: pending, duration: 500 });
    }
  };

  type StationIdIndex = Record<string, (typeof stations)[number]>;

  const stationsById = useMemo<StationIdIndex>(() => {
    const index: StationIdIndex = {};
    for (const s of stations) {
      if (s.properties.id) index[s.properties.id] = s;
    }
    return index;
  }, [stations]);

  const stationsSourceData = useMemo<GeoJSON.FeatureCollection>(() => {
    const features = stations.map((f) => {
      const { _price95, _priceDiesel } = f.properties;
      let _priceLabel = '';
      if (_price95 != null && _priceDiesel != null) _priceLabel = `95 ${_price95}\nD ${_priceDiesel}`;
      else if (_price95 != null) _priceLabel = `95 ${_price95}`;
      else if (_priceDiesel != null) _priceLabel = `D ${_priceDiesel}`;
      return { ...f, properties: { ...f.properties, _priceLabel } };
    });

    if (__DEV__) {
      for (const f of stations) {
        const [lng, lat] = f.geometry.coordinates;
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          console.warn('[StationMap] BAD COORDS', f.properties.id, f.geometry.coordinates);
        }
      }
    }

    return { type: 'FeatureCollection', features };
  }, [stations]);

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
        onDidFinishRenderingMapFully={handleMapFullyRendered}
    >
      <Camera
        ref={cameraRef}
        center={stableCameraCenter.current}
        zoom={12}
      />
      {userLocation && (
        <Marker
          id="mlrn-user-location"
          lngLat={[userLocation.longitude, userLocation.latitude]}
          anchor="center"
        >
          {markerConfig.type === 'image' ? (
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              overflow: 'hidden',
              borderWidth: 2.5,
              borderColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Image
                source={{ uri: markerConfig.value }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 1,
              shadowRadius: 4,
              elevation: 5,
            }}>
              {markerConfig.type === 'icon' && (
                <Icon name={markerConfig.value} size={50} color={colors.pin} />
              )}
              {markerConfig.type === 'svg' && (() => {
                const SvgComp = svgMarkers[markerConfig.value];
                return SvgComp ? <SvgComp size={50} color={colors.pin} /> : null;
              })()}
            </View>
          )}
        </Marker>
      )}

      <Images images={{ ...BRAND_ICONS, ...BRAND_LOGO_IMAGES }} />

      <GeoJSONSource
        id="station-points"
        data={stationsSourceData}
        onPress={(event) => {
          const feature = event.nativeEvent.features?.[0];
          const featureId = feature?.properties?.id;
          if (featureId) {
            const station = stationsById[featureId];
            if (station) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onMarkerPress(station);
            }
          }
        }}
      >
        <Layer
          id="station-dots"
          type="circle"
          source="station-points"
          maxzoom={STATION_MARKER_MIN_ZOOM}
          paint={{
            'circle-radius': 8,
            'circle-color': colors.pin,
            'circle-stroke-width': 2,
            'circle-stroke-color': colors.pinStroke,
          }}
        />
        <Layer
          id="station-markers"
          type="symbol"
          source="station-points"
          minzoom={STATION_MARKER_MIN_ZOOM}
          layout={{
            'icon-image': MARKER_SHAPE_ICON,
            'icon-anchor': 'bottom',
            'icon-size': 1,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'text-field': ['get', '_priceLabel'],
            'text-anchor': 'top',
            'text-offset': [0, -5.0],
            'text-size': 11,
            'text-font': ['Noto Sans Bold'],
            'text-allow-overlap': false,
            'text-transform': 'uppercase',
          } as const}
          paint={{
            'icon-color': colors.markerBody,
            'icon-halo-color': colors.markerPriceHalo,
            'icon-halo-width': 1,
            'text-color': colors.markerPriceText,
            'text-halo-color': colors.markerPriceHalo,
            'text-halo-width': 2,
          }}
        />
        <Layer
          id="station-marker-logo"
          type="symbol"
          source="station-points"
          minzoom={STATION_MARKER_MIN_ZOOM}
          layout={{
            'icon-image': buildLogoImageExpression(),
            'icon-anchor': 'center',
            'icon-size': 0.5,
            'icon-offset': [0, -144],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          } as const}
          paint={{
            'icon-halo-color': colors.markerPriceHalo,
            'icon-halo-width': 1,
          }}
        />
      </GeoJSONSource>
      </Map>
  );
}

export const StationMap = memo(StationMapComponent);