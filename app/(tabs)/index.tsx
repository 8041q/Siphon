import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { StationMap } from '../../src/components/stationMap/StationMap';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { FilterSheet } from '../../src/components/FilterSheet';
import { Icon } from '../../src/components/ui/icon';
import { usePalette } from '../../src/hooks/usePalette';
import { useStations, useUI, useLocationState, useActions } from '../../src/hooks/useApp';

export default function MapScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  const { palette } = usePalette();
  const scheme = (colorScheme ?? 'light') as 'light' | 'dark';
  const tintColor = palette[scheme].tint;
  const secondaryLabelColor = palette[scheme].secondaryLabel;

  const { filteredStations, loading, syncProgress, error, offline, rateLimited } = useStations();
  const { location, requestingLocation, locateWithGps } = useLocationState();
  const { setSelectedStation, searchFilter, setSearchFilter } = useUI();
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

  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showRateLimitedBanner, setShowRateLimitedBanner] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const searchVersionRef = useRef(0);
  const stationsLenRef = useRef(filteredStations.length);
  stationsLenRef.current = filteredStations.length;

  const onMarkerPress = useCallback(
    (station: (typeof filteredStations)[number]) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );

  useEffect(() => {
    if (offline) {
      setShowOfflineBanner(true);
      const timer = setTimeout(() => setShowOfflineBanner(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineBanner(false);
    }
  }, [offline]);

  useEffect(() => {
    if (rateLimited) {
      setShowRateLimitedBanner(true);
      const timer = setTimeout(() => setShowRateLimitedBanner(false), 8000);
      return () => clearTimeout(timer);
    } else {
      setShowRateLimitedBanner(false);
    }
  }, [rateLimited]);

  const insets = useSafeAreaInsets();

  const mapCenterRef = useRef({ lat: location.latitude, lng: location.longitude, bounds: undefined as [number, number, number, number] | undefined });
  const firstBoundsRef = useRef(false);

  const handleRegionChange = useCallback((lat: number, lng: number, bounds?: [number, number, number, number]) => {
    mapCenterRef.current = { lat, lng, bounds };
    if (!bounds) return;
    const [west, south, east, north] = bounds;
    // Ignore the initial pre-camera world view (centered 0,0 with global bounds) —
    // it's not a real map region and would load bogus grid_0_0 stations.
    if (east - west >= 180 || north - south >= 160) return;
    if (!firstBoundsRef.current) {
      firstBoundsRef.current = true;
      loadStationsForRegion(lat, lng, bounds);
    }
  }, [loadStationsForRegion]);

  const handleSearchArea = useCallback(async () => {
    const thisVersion = ++searchVersionRef.current;
    const result = await loadStationsForRegion(mapCenterRef.current.lat, mapCenterRef.current.lng, mapCenterRef.current.bounds);
    if (searchVersionRef.current === thisVersion) {
      setSearchFeedback(
        result.length === 0
          ? t('map.empty_search')
          : t('map.stations_found', { count: result.length }),
      );
      setTimeout(() => setSearchFeedback(null), 3000);
    }
  }, [loadStationsForRegion, t]);

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
    if (gps) setFlyToCoords([gps.longitude, gps.latitude]);
  }, [locateWithGps]);

  const gpsOnceRef = useRef(false);
  useEffect(() => {
    if (!gpsOnceRef.current) {
      gpsOnceRef.current = true;
      (async () => {
        const gps = await locateWithGps();
        if (gps) setFlyToCoords([gps.longitude, gps.latitude]);
      })();
    }
  }, [locateWithGps]);

  if (loading) return <SyncOverlay message={syncProgress} />;

  if (error) {
    return (
      <View style={{ paddingTop: insets.top }} className="flex-1 justify-center items-center p-xl bg-background dark:bg-background-dark">
        <Text className="text-destructive dark:text-destructive-dark text-center">{error}</Text>
      </View>
    );
  }

  const initialRegion = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Map rendering full bleed */}
      <StationMap
        initialRegion={initialRegion}
        stations={filteredStations}
        onMarkerPress={onMarkerPress}
        onRegionChange={handleRegionChange}
        onMapReady={handleMapReady}
        flyToCoords={flyToCoords}
        userLocation={location}
      />

      {/* Offline Banner positioning below status bar */}
      {showOfflineBanner && (
        <View style={{ paddingTop: insets.top }} className="absolute top-0 left-0 right-0 z-10">
          <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={{ overflow: 'hidden' }}>
            <View className="py-1.5 px-lg" pointerEvents="box-none">
              <Text style={{ color: secondaryLabelColor }} className="text-footnote text-center">
                {t('map.offline_banner')}
              </Text>
            </View>
          </BlurView>
        </View>
      )}

      {/* Rate-limit notice — sync was paused to avoid hitting GitHub limits */}
      {showRateLimitedBanner && (
        <View style={{ paddingTop: insets.top }} className="absolute top-0 left-0 right-0 z-10">
          <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={{ overflow: 'hidden' }}>
            <View className="py-1.5 px-lg" pointerEvents="box-none">
              <Text style={{ color: secondaryLabelColor }} className="text-footnote text-center">
                {t('sync.rate_limited')}
              </Text>
            </View>
          </BlurView>
        </View>
      )}

      {/* Floating search pill */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
        <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={{ borderRadius: 999, overflow: 'hidden' }}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleSearchArea}>
            <View className="flex-row items-center gap-xs px-lg py-sm">
              <Icon name="magnifyingglass" size={20} color={tintColor} />
              <Text style={{ color: tintColor }} className="text-footnote font-semibold">
                {t('map.search_area')}
              </Text>
            </View>
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Search feedback */}
      {searchFeedback && (
        <View style={{ position: 'absolute', top: insets.top + 60, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
          <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={{ borderRadius: 999, overflow: 'hidden' }}>
            <View className="px-lg py-1.5">
              <Text style={{ color: secondaryLabelColor }} className="text-footnote">
                {searchFeedback}
              </Text>
            </View>
          </BlurView>
        </View>
      )}

      {/* Filters button */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 16, zIndex: 10 }}>
        <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={{ borderRadius: 22, overflow: 'hidden' }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => filterSheetRef.current?.present()}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View className="relative">
              <Icon name="filter_list" size={20} color={secondaryLabelColor} />
              {filterCount > 0 && (
                <View className="absolute -top-1.5 -right-1.5 rounded-full min-w-[16px] h-4 items-center justify-center px-1" style={{ backgroundColor: tintColor }}>
                  <Text className="text-[10px] font-bold">{filterCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </BlurView>
      </View>

            {/* Locate me button */}
      <View style={{ position: 'absolute', top: 140, left: 16, zIndex: 10 }}>
        <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={{ borderRadius: 22, overflow: 'hidden' }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLocate}
            disabled={requestingLocation}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {requestingLocation ? (
              <ActivityIndicator size="small" color={tintColor} />
            ) : (
              <Icon name="my_location" size={20} color={tintColor} />
            )}
          </TouchableOpacity>
        </BlurView>
      </View>

      <FilterSheet
        ref={filterSheetRef}
        searchFilter={searchFilter}
        onApply={setSearchFilter}
      />
    </View>
  );
}