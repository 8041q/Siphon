import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

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

  const mapCenterRef = useRef({ lat: location.latitude, lng: location.longitude });

  const handleRegionChange = useCallback((lat: number, lng: number) => {
    mapCenterRef.current = { lat, lng };
  }, []);

  const handleSearchArea = useCallback(() => {
    loadStationsForRegion(mapCenterRef.current.lat, mapCenterRef.current.lng);
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
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
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

      <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 10 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={handleSearchArea}>
          <BlurView
            intensity={80}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            className="flex-row items-center gap-xs px-lg py-sm rounded-full overflow-hidden"
          >
            <Icon name="magnifyingglass" size={17} color="#0C8599" />
            <Text className="text-footnote font-semibold text-tint">
              Search this area
            </Text>
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );
}
