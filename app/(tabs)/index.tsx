import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { StationMap } from '../../src/components/stationMap/StationMap';
import { SyncOverlay } from '../../src/components/SyncOverlay';
import { Icon } from '../../src/theme/Icon';
import { useStations, useUI, useLocationState, useActions } from '../../src/hooks/useApp';
import { tokens } from '../../src/theme/tokens';

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  const s = tokens.spacing;
  const t = tokens.typography;

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

  const handleSearchArea = useCallback(() => {
    // Trigger region reload with current visible bounds
    loadStationsForRegion(location.latitude, location.longitude);
  }, [loadStationsForRegion, location]);

  if (loading) return <SyncOverlay message={syncProgress} />;

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.destructive, textAlign: 'center' }}>{error}</Text>
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
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <StationMap
        initialRegion={initialRegion}
        stations={filteredStations}
        onMarkerPress={onMarkerPress}
        onRegionChange={loadStationsForRegion}
      />

      <View style={{ position: 'absolute', bottom: 120, right: s.lg }}>
        <TouchableOpacity activeOpacity={0.7} onPress={handleSearchArea}>
          <BlurView
            intensity={80}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: s.xs,
              paddingHorizontal: s.lg,
              paddingVertical: s.sm,
              borderRadius: 24,
              overflow: 'hidden',
            }}
          >
            <Icon sf="magnifyingglass" md="search" size={17} color={colors.tint} />
            <Text style={{ fontSize: t.footnote.size, fontWeight: '600', color: colors.tint }}>
              Search this area
            </Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      {showOfflineBanner && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <View style={{ backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: 16 }} pointerEvents="box-none">
            <Text style={{ color: colors.secondaryLabel, fontSize: t.footnote.size, textAlign: 'center' }}>
              Using cached data — no connection
            </Text>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}