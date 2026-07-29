import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


import { StationMap } from '../../src/components/stationMap/StationMap';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { Icon } from '../../src/components/ui/icon';
import { useStations, useUI, useLocationState, useActions } from '../../src/hooks/useApp';

export default function MapScreen() {
  const colorScheme = useColorScheme();

  const { filteredStations, loading, syncProgress, error, offline } = useStations();
  const { location } = useLocationState();
  const { setSelectedStation } = useUI();
  const { loadStationsForRegion } = useActions();

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

  if (loading) return <SyncOverlay message={syncProgress} />;

  if (error) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-xl">
        <Text className="text-destructive dark:text-destructive-dark text-center">{error}</Text>
      </SafeAreaView>
    );
  }

  const initialRegion = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={[]}>
        {/*
          To re-enable auto-fetch on map movement, replace handleRegionChange below with:
          onRegionChange={loadStationsForRegion}
        */}
        <StationMap
          initialRegion={initialRegion}
          stations={filteredStations}
          onMarkerPress={onMarkerPress}
          onRegionChange={handleRegionChange}
        />

        {showOfflineBanner && (
          <View className="absolute top-0 left-0 right-0 z-10">
            <View className="bg-surface dark:bg-surface-dark py-1.5 px-lg" pointerEvents="box-none">
              <Text className="text-secondary-label dark:text-secondary-label-dark text-footnote text-center">
                Using cached data — no connection
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
        <TouchableOpacity activeOpacity={0.7} onPress={handleSearchArea}>
          <View
            className="flex-row items-center gap-xs px-lg py-sm rounded-full"
            style={{
              backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Icon name="magnifyingglass" size={17} color="#0C8599" />
            <Text className="text-footnote font-semibold text-tint">
              Search this area
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
