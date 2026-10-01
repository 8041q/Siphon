import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { Image, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Map as MapComponent, Camera, Marker, GeoJSONSource, Layer, type CameraRef } from '@maplibre/maplibre-react-native';
import * as Haptics from 'expo-haptics';

import type { MapCameraRequest, StationMapProps } from './types';
import type { FuelStationFeature } from '../../api/siphonClient';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAppearanceSupport } from '../../hooks/useSupport';
import { svgMarkers } from '../userLocationMarkers';
import { getStationMarkerImage } from './brandIcons';
import { MARKER_WIDTH, MARKER_HEIGHT, PRICE_TEXT_SIZE, PRICE_TOP, getMarkerStackOrders } from './markerLayout';
import { measureSync } from '../../utils/perf';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Below this zoom we fall back to the lightweight circle dots so the whole
// country is never rendered as individual markers.
export const STATION_MARKER_MIN_ZOOM = 13;

const StationPriceMarker = memo(function StationPriceMarker({ station, zIndex, onPress }: {
  station: FuelStationFeature;
  zIndex: number;
  onPress: (station: FuelStationFeature) => void;
}) {
  const [longitude, latitude] = station.geometry.coordinates;
  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress(station);
  }, [onPress, station]);

  return (
    <Marker
      id={`station-${station.properties.id}`}
      lngLat={[longitude, latitude]}
      anchor="bottom"
      // The native marker view treats its image and price as one z-indexed unit.
      style={{ zIndex }}
      onPress={handlePress}
    >
      <View style={{ width: MARKER_WIDTH, height: MARKER_HEIGHT }}>
        <Image
          source={getStationMarkerImage(station.properties._icon)}
          style={{ width: MARKER_WIDTH, height: MARKER_HEIGHT }}
          resizeMode="stretch"
        />
        <Text
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: PRICE_TOP,
            left: 0,
            width: MARKER_WIDTH,
            color: '#FFFFFF',
            fontSize: PRICE_TEXT_SIZE,
            fontWeight: '700',
            lineHeight: PRICE_TEXT_SIZE * 1.2,
            includeFontPadding: false,
            textAlign: 'center',
            textShadowColor: '#111111',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 2,
          }}
        >
          {station.properties._priceLabel}
        </Text>
      </View>
    </Marker>
  );
});

function StationMapComponent({ initialRegion, stations, onMarkerPress, onRegionChange, onMapReady, cameraRequest, onCameraRequestConsumed, userLocation }: StationMapProps) {
  const { colors } = useThemeTokens();
  const reducedMotion = useReducedMotion();
  const cameraRef = useRef<CameraRef>(null);
  const { marker: markerConfig } = useAppearanceSupport();
  const onMapReadyFired = useRef(false);
  const isMounted = useRef(false);
  const pendingCameraRequestRef = useRef<MapCameraRequest | null>(null);
  const layoutReadyRef = useRef(false);
  const cameraMountedRef = useRef(false);
  const cameraMoveFrameRef = useRef<number | null>(null);
  const lastAppliedCameraRequestIdRef = useRef<number | null>(null);
  const [cameraMounted, setCameraMounted] = useState(false);
  const [showDetailedMarkers, setShowDetailedMarkers] = useState(true);
  const [mapBearing, setMapBearing] = useState(0);

  // Stable camera center - written once on first render so the native map never
  // receives a mid-init reposition via the Camera prop. All subsequent moves
  // go through the guarded imperative camera path after layout/map readiness.
  const stableCameraCenter = useRef<[number, number]>([initialRegion.longitude, initialRegion.latitude]);
  if (!Number.isFinite(stableCameraCenter.current[0]) || !Number.isFinite(stableCameraCenter.current[1])) {
    stableCameraCenter.current = [initialRegion.longitude, initialRegion.latitude];
  }

  useEffect(() => {
    // React Strict Mode re-runs effects in development. Set this inside the effect
    // so the cleanup from the first pass cannot leave the ref permanently false.
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (cameraMoveFrameRef.current !== null) {
        cancelAnimationFrame(cameraMoveFrameRef.current);
        cameraMoveFrameRef.current = null;
      }
    };
  }, []);

  const flushPendingCameraMove = useCallback(() => {
    if (
      !isMounted.current ||
      !layoutReadyRef.current ||
      !cameraMountedRef.current ||
      !onMapReadyFired.current ||
      !pendingCameraRequestRef.current ||
      !cameraRef.current
    ) {
      return;
    }

    if (cameraMoveFrameRef.current !== null) {
      cancelAnimationFrame(cameraMoveFrameRef.current);
    }

    // Run on the frame after layout. This avoids MapLibre's iOS CameraUpdateItem
    // path seeing a transient zero-sized map during tab/sheet transitions.
    cameraMoveFrameRef.current = requestAnimationFrame(() => {
      cameraMoveFrameRef.current = null;
      if (
        !isMounted.current ||
        !layoutReadyRef.current ||
        !onMapReadyFired.current ||
        !cameraRef.current
      ) {
        return;
      }

      const request = pendingCameraRequestRef.current;
      if (!request) return;
      if (lastAppliedCameraRequestIdRef.current === request.requestId) {
        pendingCameraRequestRef.current = null;
        onCameraRequestConsumed?.(request.requestId);
        return;
      }

      pendingCameraRequestRef.current = null;
      lastAppliedCameraRequestIdRef.current = request.requestId;

      // Repeated flyTo() calls have a known iOS/New-Architecture issue in
      // MapLibre RN. Keep all programmatic movement on the guarded easeTo path.
      // Station focus gets the intentional cinematic zoom; locate-me restores
      // the map's normal default zoom. Startup GPS never creates a request.
      cameraRef.current.easeTo({
        center: request.coordinates,
        zoom: request.mode === 'station' ? 15.2 : 13.3,
        duration: reducedMotion ? 0 : request.mode === 'station' ? 550 : 350,
        easing: 'ease',
      });
      onCameraRequestConsumed?.(request.requestId);
    });
  }, [onCameraRequestConsumed, reducedMotion]);

  useEffect(() => {
    if (!cameraRequest || !isMounted.current) return;
    const [longitude, latitude] = cameraRequest.coordinates;
    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      Math.abs(longitude) > 180 ||
      Math.abs(latitude) > 90
    ) {
      onCameraRequestConsumed?.(cameraRequest.requestId);
      return;
    }

    pendingCameraRequestRef.current = cameraRequest;
    flushPendingCameraMove();
  }, [cameraRequest, flushPendingCameraMove, onCameraRequestConsumed]);

  const handleMapLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    layoutReadyRef.current = Number.isFinite(width) && Number.isFinite(height) && width > 1 && height > 1;

    if (!layoutReadyRef.current) return;

    if (!cameraMountedRef.current) {
      cameraMountedRef.current = true;
      setCameraMounted(true);
      return;
    }

    flushPendingCameraMove();
  }, [flushPendingCameraMove]);

  useEffect(() => {
    if (cameraMounted) flushPendingCameraMove();
  }, [cameraMounted, flushPendingCameraMove]);

  const handleMapFullyRendered = useCallback(() => {
    if (!onMapReadyFired.current) {
      onMapReadyFired.current = true;
      onMapReady?.();
    }
    flushPendingCameraMove();
  }, [flushPendingCameraMove, onMapReady]);

  const { stationsById, stationsSourceData, validStations } = useMemo(
    () => measureSync('siphon.map.build_source', () => {
      const index = new Map<string, (typeof stations)[number]>();
      const features: GeoJSON.Feature[] = [];
      const validStations: FuelStationFeature[] = [];

      for (const station of stations) {
        const [lng, lat] = station.geometry.coordinates;
        const validCoords =
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          Math.abs(lat) <= 90 &&
          Math.abs(lng) <= 180;

        if (!validCoords) {
          if (__DEV__) {
            console.warn('[StationMap] BAD COORDS', station.properties.id, station.geometry.coordinates);
          }
          continue;
        }

        const id = station.properties.id;
        if (id) index.set(String(id), station);

        // Marker enrichment already produced the MapLibre-only properties. Push
        // the feature directly instead of cloning every station + properties
        // again on each region/source update.
        features.push(station);
        validStations.push(station);
      }

      // Android's marker hit-testing uses insertion order. Start with the
      // frontmost (southern) pin first for the default north-up orientation.
      validStations.sort((a, b) => a.geometry.coordinates[1] - b.geometry.coordinates[1]);

      return {
        stationsById: index,
        stationsSourceData: { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection,
        validStations,
      };
    }, 2),
    [stations],
  );

  const dotPaint = useMemo(
    () => ({
      'circle-radius': 8,
      'circle-color': colors.pin,
      'circle-stroke-width': 2,
      'circle-stroke-color': colors.pinStroke,
    }),
    [colors.pin, colors.pinStroke],
  );

  const markerStackOrders = useMemo(() => {
    return getMarkerStackOrders(validStations, mapBearing);
  }, [validStations, mapBearing]);

  const validUserLocation =
    userLocation != null &&
    Number.isFinite(userLocation.latitude) &&
    Number.isFinite(userLocation.longitude) &&
    Math.abs(userLocation.latitude) <= 90 &&
    Math.abs(userLocation.longitude) <= 180;

  const handleRegionDidChange = useCallback(
    (event: Parameters<NonNullable<ComponentProps<typeof MapComponent>['onRegionDidChange']>>[0]) => {
      const zoom = event.nativeEvent.zoom;
      if (Number.isFinite(zoom)) setShowDetailedMarkers(zoom >= STATION_MARKER_MIN_ZOOM);
      const bearing = event.nativeEvent.bearing;
      if (Number.isFinite(bearing)) setMapBearing(Math.round(bearing));
      if (!onRegionChange) return;

      const nativeEvent = event.nativeEvent as unknown as { center?: unknown; bounds?: unknown };
      const center = nativeEvent.center;
      let lng: number;
      let lat: number;

      if (Array.isArray(center)) {
        lng = Number(center[0]);
        lat = Number(center[1]);
      } else if (center && typeof center === 'object') {
        const value = center as { longitude?: unknown; latitude?: unknown; 0?: unknown; 1?: unknown };
        lng = Number(value.longitude ?? value[0]);
        lat = Number(value.latitude ?? value[1]);
      } else {
        return;
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const rawBounds = nativeEvent.bounds;
      let bounds: [number, number, number, number] | undefined;
      if (Array.isArray(rawBounds)) {
        if (Array.isArray(rawBounds[0]) && rawBounds.length === 2) {
          const sw = rawBounds[0];
          const ne = rawBounds[1];
          const candidate = [Number(sw[0]), Number(sw[1]), Number(ne[0]), Number(ne[1])] as const;
          if (candidate.every(Number.isFinite)) bounds = [...candidate];
        } else if (rawBounds.length === 4) {
          const candidate = rawBounds.map(Number);
          if (candidate.every(Number.isFinite)) {
            bounds = [candidate[0], candidate[1], candidate[2], candidate[3]];
          }
        }
      }

      onRegionChange(lat, lng, bounds);
    },
    [onRegionChange],
  );

  const handleRegionIsChanging = useCallback(
    (event: Parameters<NonNullable<ComponentProps<typeof MapComponent>['onRegionIsChanging']>>[0]) => {
      const zoom = event.nativeEvent.zoom;
      if (Number.isFinite(zoom)) setShowDetailedMarkers(zoom >= STATION_MARKER_MIN_ZOOM);
      const bearing = event.nativeEvent.bearing;
      if (Number.isFinite(bearing)) setMapBearing(Math.round(bearing));
    },
    [],
  );

  const handleStationSourcePress = useCallback(
    (event: Parameters<NonNullable<ComponentProps<typeof GeoJSONSource>['onPress']>>[0]) => {
      const feature = event.nativeEvent.features?.[0];
      const featureId = feature?.properties?.id;
      if (featureId == null) return;

      const station = stationsById.get(String(featureId));
      if (!station) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      onMarkerPress(station);
    },
    [onMarkerPress, stationsById],
  );

  return (
    <View style={{ flex: 1 }} onLayout={handleMapLayout}>
      {/* Keep the Android map in the view hierarchy so sheet/backdrop overlays
          and the blur target composite together, including at the screen edge. */}
      <MapComponent
        style={{ flex: 1 }}
        androidView="texture"
        mapStyle={OPENFREEMAP_STYLE}
        compass
        logo={false}
        touchZoom
        doubleTapZoom
        onRegionIsChanging={handleRegionIsChanging}
        onRegionDidChange={handleRegionDidChange}
        onDidFinishRenderingMapFully={handleMapFullyRendered}
      >
        {cameraMounted && (
          <Camera
            ref={cameraRef}
            center={stableCameraCenter.current}
            zoom={13.3}
          />
        )}

      {validUserLocation && userLocation && (
        <Marker
          id="mlrn-user-location"
          lngLat={[userLocation.longitude, userLocation.latitude]}
          anchor="center"
          style={{ zIndex: validStations.length + 1 }}
        >
          {markerConfig.type === 'image' ? (
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 25,
                  overflow: 'hidden',
                  borderWidth: 2.5,
                  borderColor: colors.markerBody,
                }}
              >
                <Image
                  source={{ uri: markerConfig.value }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            </View>
          ) : (
            <View
              style={{
                width: 50,
                height: 50,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              {markerConfig.type === 'svg' && (() => {
                const SvgComp = svgMarkers[markerConfig.value];
                return SvgComp ? <SvgComp size={50} color={colors.pin} /> : null;
              })()}
            </View>
          )}
        </Marker>
      )}

      <GeoJSONSource
        id="station-points"
        data={stationsSourceData}
        onPress={handleStationSourcePress}
      >
        <Layer
          id="station-dots"
          type="circle"
          source="station-points"
          maxzoom={STATION_MARKER_MIN_ZOOM}
          paint={dotPaint}
        />
        </GeoJSONSource>
        {showDetailedMarkers && validStations.map((station) => (
          <StationPriceMarker
            key={station.properties.id}
            station={station}
            zIndex={markerStackOrders.get(station.properties.id) ?? 0}
            onPress={onMarkerPress}
          />
        ))}
      </MapComponent>
    </View>
  );
}

export const StationMap = memo(StationMapComponent);
