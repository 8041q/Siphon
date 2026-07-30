import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import type { FuelStationFeature } from '../api/siphonClient';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';
import { useUI } from '../hooks/useApp';

function DetailContent({ station, onClose }: { station: FuelStationFeature; onClose: () => void }) {
  const { t } = useTranslation();
  const { name, brand, address, fuels, hours, schedule, services, paymentMethods, municipality, district, province, postalCode, observations, otherServices, lastUpdated, extra } = station.properties;
  const entries = Object.entries(fuels ?? {}) as [string, number][];

  return (
    <View className="gap-sm p-lg">
      <Text className="text-title-3 text-label dark:text-label-dark">
        {brand || name || t('common.unknown_station')}
      </Text>
      <Text className="text-subheadline text-secondary-label dark:text-secondary-label-dark">{address}</Text>

      {schedule || hours ? (
        <View className="mt-sm">
          <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs">
            {t('station.hours')}
          </Text>
          {schedule ? (
            <Text className="text-footnote text-secondary-label">{schedule}</Text>
          ) : (
            <>
              {hours.weekdays && <Text className="text-footnote text-secondary-label">{t('station.weekdays')}: {hours.weekdays}</Text>}
              {hours.saturday && <Text className="text-footnote text-secondary-label">{t('station.saturday')}: {hours.saturday}</Text>}
              {hours.sunday && <Text className="text-footnote text-secondary-label">{t('station.sunday')}: {hours.sunday}</Text>}
              {hours.holiday && <Text className="text-footnote text-secondary-label">{t('station.holiday')}: {hours.holiday}</Text>}
            </>)}
        </View>
      ) : null}

      {services?.length > 0 && (
        <View className="mt-sm">
          <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs">
            {t('station.services')}
          </Text>
          <Text className="text-footnote text-secondary-label">
            {Array.isArray(services) ? services.join(', ') : services}
          </Text>
        </View>
      )}

      {paymentMethods?.length > 0 && (
        <View className="mt-sm">
          <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs">
            {t('station.payment_methods')}
          </Text>
          <Text className="text-footnote text-secondary-label">
            {Array.isArray(paymentMethods) ? paymentMethods.join(', ') : paymentMethods}
          </Text>
        </View>
      )}

      {(municipality || district || province || postalCode) && (
        <View className="mt-sm">
          <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs">
            {municipality || district || province}
          </Text>
          {postalCode && <Text className="text-footnote text-secondary-label">{postalCode}</Text>}
        </View>
      )}

      {(observations || otherServices || extra?.stationType || extra?.margin || lastUpdated) && (
        <View className="mt-sm">
          <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs">{t('common.station')}</Text>
          {extra?.stationType && <Text className="text-footnote text-secondary-label">{t('station.station_type')}: {extra?.stationType}</Text>}
          {otherServices && <Text className="text-footnote text-secondary-label">{t('station.other_services')}: {otherServices}</Text>}
          {extra?.margin && <Text className="text-footnote text-secondary-label">{t('station.margin')}: {extra?.margin}</Text>}
          {observations && <Text className="text-footnote text-secondary-label">{observations}</Text>}
          {lastUpdated && <Text className="text-footnote text-secondary-label">{t('station.last_updated')}: {lastUpdated}</Text>}
        </View>
      )}

      <View className="flex-row flex-wrap gap-sm mt-sm">
        {entries.map(([fuel, price]) => (
          <View key={fuel} className="bg-surface dark:bg-surface-dark rounded-sm px-sm py-xs">
            <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
              {fuelLabel(fuel)}: {price.toFixed(3)}{fuelUnit(fuel, station.properties.source)}
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
            {t('station.view_price_history')}
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
      enableContentPanningGesture
      enableDynamicSizing={false}
      onDismiss={handleDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
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