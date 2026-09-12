import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router';
import { AccessibilityInfo, ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { StationMap } from '../../src/components/stationMap/StationMap';
import type { MapCameraRequest } from '../../src/components/stationMap/types';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { FilterSheet } from '../../src/components/FilterSheet';
import { Icon } from '../../src/components/ui/icon';
import { GlassSurface } from '../../src/components/ui/glass';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { useStationMapData, useStationSync, useUI, useLocationState, useActions } from '../../src/hooks/useApp';


async function accessibleTimeout(defaultMs: number): Promise<number> {
  if (Platform.OS !== 'android') return defaultMs;
  return AccessibilityInfo.getRecommendedTimeoutMillis(defaultMs).catch(() => defaultMs);
}

export default function MapScreen() {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const isFocused = useIsFocused();

  const { stations, filteredStations } = useStationMapData();
  const { loading, syncProgress, error, offline, rateLimited, reload } = useStationSync();
  const { location, requestingLocation, locateWithGps } = useLocationState();
  const {
    setSelectedStation,
    searchFilter,
    setSearchFilter,
    mapFocusRequest,
    clearMapFocusRequest,
  } = useUI();
  const { loadStationsForRegion } = useActions();

  const filterSheetRef = useRef<{ present: () => void }>(null);
  const filterCount = useMemo(() => {
    let count = 0;
    if (searchFilter.countries && searchFilter.countries.length > 0) count++;
    if (searchFilter.fuelTypes && searchFilter.fuelTypes.length > 0) count++;
    if (searchFilter.priceRange) count++;
    if (searchFilter.city?.trim()) count++;
    if (searchFilter.maxDistance) count++;
    return count;
  }, [searchFilter]);

  const [cameraRequest, setCameraRequest] = useState<MapCameraRequest | null>(null);
  const cameraRequestSeqRef = useRef(0);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showRateLimitedBanner, setShowRateLimitedBanner] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const searchVersionRef = useRef(0);
  const searchFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stationsLenRef = useRef(filteredStations.length);
  stationsLenRef.current = filteredStations.length;

  const onMarkerPress = useCallback(
    (station: (typeof filteredStations)[number]) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );

  useEffect(() => {
    if (!offline) {
      setShowOfflineBanner(false);
      return;
    }

    setShowOfflineBanner(true);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void accessibleTimeout(5000).then((timeout) => {
      if (!cancelled) timer = setTimeout(() => setShowOfflineBanner(false), timeout);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [offline]);

  useEffect(() => {
    if (!rateLimited) {
      setShowRateLimitedBanner(false);
      return;
    }

    setShowRateLimitedBanner(true);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void accessibleTimeout(8000).then((timeout) => {
      if (!cancelled) timer = setTimeout(() => setShowRateLimitedBanner(false), timeout);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [rateLimited]);

  const insets = useSafeAreaInsets();

  const mapCenterRef = useRef({ lat: location.latitude, lng: location.longitude, bounds: undefined as [number, number, number, number] | undefined });
  const firstBoundsRef = useRef(false);
  const previousLoadingRef = useRef(loading);

  const mapFocusFrameRef = useRef<number | null>(null);

  // A clickable alternative in the "worth the trip" card can request a map
  // focus from any tab. Keep the request queued while this tab is unfocused.
  // On iOS/New Architecture MapLibre can abort natively if an imperative camera
  // update lands while a tab transition has temporarily laid the map out at 0x0.
  useEffect(() => {
    if (!mapFocusRequest || !isFocused) return;

    const request = mapFocusRequest;
    if (mapFocusFrameRef.current !== null) {
      cancelAnimationFrame(mapFocusFrameRef.current);
    }

    // Give the focused tab one layout frame before handing the target to the
    // map. StationMap has its own layout guard as a second line of defence.
    mapFocusFrameRef.current = requestAnimationFrame(() => {
      mapFocusFrameRef.current = null;
      const [longitude, latitude] = request.coordinates;
      mapCenterRef.current = { lat: latitude, lng: longitude, bounds: undefined };
      setCameraRequest({
        requestId: ++cameraRequestSeqRef.current,
        coordinates: [longitude, latitude],
        mode: 'station',
      });
      void loadStationsForRegion(latitude, longitude);
      clearMapFocusRequest(request.requestId);
    });

    return () => {
      if (mapFocusFrameRef.current !== null) {
        cancelAnimationFrame(mapFocusFrameRef.current);
        mapFocusFrameRef.current = null;
      }
    };
  }, [clearMapFocusRequest, isFocused, loadStationsForRegion, mapFocusRequest]);

  const handleRegionChange = useCallback((lat: number, lng: number, bounds?: [number, number, number, number]) => {
    mapCenterRef.current = { lat, lng, bounds };
    if (!bounds) return;
    const [west, south, east, north] = bounds;
    // Ignore the initial pre-camera world view (centered 0,0 with global bounds) -
    // it's not a real map region and would load bogus grid_0_0 stations.
    if (east - west >= 180 || north - south >= 160) return;
    if (!firstBoundsRef.current) {
      firstBoundsRef.current = true;
      loadStationsForRegion(lat, lng, bounds);
    }
  }, [loadStationsForRegion]);

  // If the first visible-region read happened while the startup sync was still
  // running, refresh that exact region once the new tiles are committed. This
  // prevents the map from keeping stale pre-sync prices until the user pans.
  useEffect(() => {
    const justFinishedLoading = previousLoadingRef.current && !loading;
    previousLoadingRef.current = loading;
    if (!justFinishedLoading || !firstBoundsRef.current) return;
    const { lat, lng, bounds } = mapCenterRef.current;
    if (!bounds) return;
    void loadStationsForRegion(lat, lng, bounds);
  }, [loading, loadStationsForRegion]);

  const handleSearchArea = useCallback(async () => {
    const thisVersion = ++searchVersionRef.current;
    const result = await loadStationsForRegion(mapCenterRef.current.lat, mapCenterRef.current.lng, mapCenterRef.current.bounds);
    if (searchVersionRef.current === thisVersion) {
      setSearchFeedback(
        result.length === 0
          ? t('map.empty_search')
          : t('map.stations_found', { count: result.length }),
      );
      if (searchFeedbackTimeoutRef.current) clearTimeout(searchFeedbackTimeoutRef.current);
      const timeout = await accessibleTimeout(3000);
      if (searchVersionRef.current !== thisVersion) return;
      searchFeedbackTimeoutRef.current = setTimeout(() => {
        searchFeedbackTimeoutRef.current = null;
        setSearchFeedback(null);
      }, timeout);
    }
  }, [loadStationsForRegion, t]);

  useEffect(() => {
    return () => {
      searchVersionRef.current += 1;
      if (searchFeedbackTimeoutRef.current) {
        clearTimeout(searchFeedbackTimeoutRef.current);
        searchFeedbackTimeoutRef.current = null;
      }
    };
  }, []);

  const mapReadyRef = useRef(false);
  const handleMapReady = useCallback(() => {
    if (mapReadyRef.current) return;
    mapReadyRef.current = true;
    if (stationsLenRef.current === 0) {
      loadStationsForRegion(mapCenterRef.current.lat, mapCenterRef.current.lng, mapCenterRef.current.bounds);
    }
  }, [loadStationsForRegion]);

  const handleLocate = useCallback(async () => {
    const gps = await locateWithGps();
    if (!gps) return;
    setCameraRequest({
      requestId: ++cameraRequestSeqRef.current,
      coordinates: [gps.longitude, gps.latitude],
      mode: 'location',
    });
  }, [locateWithGps]);

  const handleCameraRequestConsumed = useCallback((requestId: number) => {
    setCameraRequest((current) => current?.requestId === requestId ? null : current);
  }, []);

  const gpsOnceRef = useRef(false);
  useEffect(() => {
    if (gpsOnceRef.current) return;
    gpsOnceRef.current = true;
    let cancelled = false;

    void (async () => {
      // Refresh the precise GPS fix for distance/routing state, but do not
      // move the camera on launch. Camera movement is reserved for explicit
      // locate-me taps and station-focus requests.
      await locateWithGps();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
      // React Strict Mode re-runs effects in development. Allow the second
      // setup to attach to the deduplicated GPS request.
      gpsOnceRef.current = false;
    };
  }, [locateWithGps]);

  const initialRegion = useMemo(() => ({
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  }), [location.latitude, location.longitude]);

  const hasRegionData = stations.length > 0;

  if (loading && !hasRegionData) return <SyncOverlay message={syncProgress} />;

  if (error && !hasRegionData) {
    return (
      <View style={{ paddingTop: insets.top, flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
        <Text style={{ color: colors.destructive, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={reload}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
          style={{ backgroundColor: colors.tint, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginTop: 12 }}
        >
          <Text style={{ color: colors.labelOnTint, fontWeight: '600' }}>
            {t('common.retry')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Map rendering full bleed */}
      <StationMap
        initialRegion={initialRegion}
        stations={filteredStations}
        onMarkerPress={onMarkerPress}
        onRegionChange={handleRegionChange}
        onMapReady={handleMapReady}
        cameraRequest={cameraRequest}
        onCameraRequestConsumed={handleCameraRequestConsumed}
        userLocation={location}
      />

      {/* Offline Banner positioning below status bar */}
      {showOfflineBanner && (
        <View style={{ paddingTop: insets.top }} className="absolute top-0 left-0 right-0 z-10">
          <GlassSurface color={colors.surface}>
            <View className="py-1.5 px-lg" pointerEvents="box-none" accessibilityLiveRegion="polite">
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote text-center">
                {t('map.offline_banner')}
              </Text>
            </View>
          </GlassSurface>
        </View>
      )}

      {/* Rate-limit notice - sync was paused to avoid hitting GitHub limits */}
      {showRateLimitedBanner && !showOfflineBanner && (
        <View style={{ paddingTop: insets.top }} className="absolute top-0 left-0 right-0 z-10">
          <GlassSurface color={colors.surface}>
            <View className="py-1.5 px-lg" pointerEvents="box-none" accessibilityLiveRegion="polite">
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote text-center">
                {t('sync.rate_limited')}
              </Text>
            </View>
          </GlassSurface>
        </View>
      )}

      {/* Floating search pill */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
        <GlassSurface color={colors.surface} style={{ borderRadius: 999 }}>
          <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSearchArea}
              accessibilityRole="button"
              accessibilityLabel={t('map.search_area')}
            >
            <View className="flex-row items-center gap-xs px-lg py-sm">
              <Icon name="magnifyingglass" size={20} color={colors.tint} />
              <Text style={{ color: colors.tint }} className="text-footnote font-semibold">
                {t('map.search_area')}
              </Text>
            </View>
          </TouchableOpacity>
        </GlassSurface>
      </View>

      {/* Search feedback */}
      {searchFeedback && (
        <View style={{ position: 'absolute', top: insets.top + 60, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
          <GlassSurface color={colors.surface} style={{ borderRadius: 999 }}>
            <View className="px-lg py-1.5" accessibilityLiveRegion="polite">
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
                {searchFeedback}
              </Text>
            </View>
          </GlassSurface>
        </View>
      )}

      {/* Filters button */}
      <View style={{ position: 'absolute', top: insets.top + 12, start: 16, zIndex: 10 }}>
        <GlassSurface color={colors.surface} style={{ borderRadius: 22 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => filterSheetRef.current?.present()}
            accessibilityRole="button"
            accessibilityLabel={
              filterCount > 0
                ? t('search.active_filters', { count: filterCount })
                : t('search.filters')
            }
            accessibilityState={{ selected: filterCount > 0 }}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View className="relative">
              <Icon name="filter_list" size={20} color={colors.tint} />
              {filterCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    end: -6,
                    backgroundColor: colors.tint,
                    borderRadius: 9999,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text className="text-[10px] font-bold" style={{ color: colors.labelOnTint }}>{filterCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </GlassSurface>
      </View>

      {/* Locate me button */}
      <View style={{ position: 'absolute', top: 128, start: 16, zIndex: 10 }}>
        <GlassSurface color={colors.surface} style={{ borderRadius: 22 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLocate}
            disabled={requestingLocation}
            accessibilityRole="button"
            accessibilityLabel={t('map.locate_me')}
            accessibilityState={{ disabled: requestingLocation, busy: requestingLocation }}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {requestingLocation ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Icon name="my_location" size={20} color={colors.tint} />
            )}
          </TouchableOpacity>
        </GlassSurface>
      </View>

      <FilterSheet
        ref={filterSheetRef}
        searchFilter={searchFilter}
        onApply={setSearchFilter}
        showSort={false}
      />
    </View>
  );
}