import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StationMap } from '../../src/components/stationMap/StationMap';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { Icon } from '../../src/components/ui/icon';
import { useStations, useUI, useLocationState, useActions } from '../../src/hooks/useApp';

export default function MapScreen() {
  const colorScheme = useColorScheme();

  const { filteredStations, loading, syncProgress, error, offline } = useStations();
  const { location, requestingLocation, locateWithGps } = useLocationState();
  const { setSelectedStation } = useUI();
  const { loadStationsForRegion } = useActions();

  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

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
    if (bounds && !firstBoundsRef.current) {
      firstBoundsRef.current = true;
      loadStationsForRegion(lat, lng, bounds);
    }
  }, [loadStationsForRegion]);

  const handleSearchArea = useCallback(() => {
    loadStationsForRegion(mapCenterRef.current.lat, mapCenterRef.current.lng, mapCenterRef.current.bounds);
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
        flyToCoords={flyToCoords}
      />

      {/* Offline Banner positioning below status bar */}
      {showOfflineBanner && (
        <View style={{ paddingTop: insets.top }} className="absolute top-0 left-0 right-0 z-10">
          <View className="bg-surface dark:bg-surface-dark py-1.5 px-lg" pointerEvents="box-none">
            <Text className="text-secondary-label dark:text-secondary-label-dark text-footnote text-center">
              Using cached data — no connection
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
            <Icon name="magnifyingglass" size={17} color="#0C8599" />
            <Text className="text-footnote font-semibold text-tint">
              Search this area
            </Text>
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
    </View>
  );
}