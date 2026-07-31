import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { StationMap } from '../../src/components/stationMap/StationMap';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { FilterSheet } from '../../src/components/FilterSheet';
import { Icon } from '../../src/components/ui/icon';
import { useStations, useUI, useLocationState, useActions } from '../../src/hooks/useApp';

export default function MapScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  const { filteredStations, loading, syncProgress, error, offline } = useStations();
  const { location, requestingLocation, locateWithGps } = useLocationState();
  const { setSelectedStation, searchFilter, setSearchFilter } = useUI();
  const { loadStationsForRegion } = useActions();

  const filterSheetRef = useRef<{ present: () => void }>(null);
  const secondaryLabel = colorScheme === 'dark' ? 'rgba(235, 235, 245, 0.75)' : 'rgba(60, 60, 67, 0.6)';
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
    if (searchVersionRef.current === thisVersion && result?.length === 0) {
      setSearchFeedback(t('map.empty_search'));
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
          <View className="bg-surface dark:bg-surface-dark py-1.5 px-lg" pointerEvents="box-none">
            <Text className="text-secondary-label dark:text-secondary-label-dark text-footnote text-center">
              {t('map.offline_banner')}
            </Text>
          </View>
        </View>
      )}

      {/* Floating search pill */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
        <TouchableOpacity activeOpacity={0.7} onPress={handleSearchArea}>
          <View
            className="flex-row items-center gap-xs px-lg py-sm rounded-full"
            style={{
              backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
            }}
          >
            <Icon name="magnifyingglass" size={20} color="#0C8599" />
            <Text className="text-footnote font-semibold text-tint">
              {t('map.search_area')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search feedback */}
      {searchFeedback && (
        <View style={{ position: 'absolute', top: insets.top + 60, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
          <View
            className="px-lg py-1.5 rounded-full"
            style={{
              backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
            }}
          >
            <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
              {searchFeedback}
            </Text>
          </View>
        </View>
      )}

      {/* Filters button */}
      <View style={{ position: 'absolute', top: insets.top + 12, right: 16, zIndex: 10 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => filterSheetRef.current?.present()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <View className="relative">
            <Icon name="filter_list" size={20} color={secondaryLabel} />
            {filterCount > 0 && (
              <View className="absolute -top-1.5 -right-1.5 bg-tint rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                <Text className="text-[10px] text-white font-bold">{filterCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Locate me button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleLocate}
        disabled={requestingLocation}
        style={{
          position: 'absolute',
          bottom: 88,
          right: 16,
          zIndex: 10,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        {requestingLocation ? (
          <ActivityIndicator size="small" color="#0C8599" />
        ) : (
          <Icon name="my_location" size={20} color="#0C8599" />
        )}
      </TouchableOpacity>

      <FilterSheet
        ref={filterSheetRef}
        searchFilter={searchFilter}
        onApply={setSearchFilter}
      />
    </View>
  );
}