import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';

import type { FuelStationFeature } from '../api/siphonClient';
import { fuelLabel } from '../utils/fuelNames';
import { useUI } from '../hooks/useApp';

function DetailContent({ station, onClose }: { station: FuelStationFeature; onClose: () => void }) {
  const { name, brand, address, fuels } = station.properties;
  const entries = Object.entries(fuels ?? {}) as [string, number][];

  return (
    <View className="gap-sm p-lg">
      <Text className="text-title-3 text-label dark:text-label-dark">
        {brand || name || 'Unknown station'}
      </Text>
      <Text className="text-subheadline text-secondary-label dark:text-secondary-label-dark">{address}</Text>

      <View className="flex-row flex-wrap gap-sm mt-sm">
        {entries.map(([fuel, price]) => (
          <View key={fuel} className="bg-surface dark:bg-surface-dark rounded-sm px-sm py-xs">
            <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
              {fuelLabel(fuel)}: {price.toFixed(3)}€
            </Text>
          </View>
        ))}
      </View>

      {entries.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            router.push(`/price-trends/${station.properties.id}`);
          }}
          className="mt-lg bg-tint rounded-md py-md items-center"
        >
          <Text className="text-white font-semibold text-callout">
            View Price History
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function StationDetailSheet() {
  const { selectedStation, setSelectedStation } = useUI();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (selectedStation && !isPresentedRef.current) {
      isPresentedRef.current = true;
      bottomSheetRef.current?.present();
    }
  }, [selectedStation]);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    setSelectedStation(null);
  }, [setSelectedStation]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableDynamicSizing={false}
      onDismiss={handleDismiss}
      backgroundStyle={{
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      }}
      handleIndicatorStyle={{ 
        backgroundColor: isDark ? 'rgba(235, 235, 245, 0.3)' : 'rgba(60, 60, 67, 0.3)' 
      }}
    >
      <BottomSheetScrollView>
        {selectedStation ? (
          <DetailContent
            station={selectedStation}
            onClose={() => bottomSheetRef.current?.dismiss()}
          />
        ) : (
          <View />
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}