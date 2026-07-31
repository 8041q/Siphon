import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { FuelStationFeature } from '../api/siphonClient';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';
import { formatSchedule, marginLabel } from '../utils/schedule';
import { cleanAddress, getLocationParts, formatStationAddress, getMapsUrl } from '../utils/location';
import { Icon } from '../theme/Icon';
import { useUI, useStations } from '../hooks/useApp';

const REPORT_ISSUE_URL = 'https://github.com/8041q/SiphonAPI/issues/new?template=incorrect-station-info.yml';

function priceColorClass(price: number): string {
  if (price < 1.65) return 'text-price-low dark:text-price-low-dark';
  if (price < 1.87) return 'text-price-mid dark:text-price-mid-dark';
  return 'text-price-high dark:text-price-high-dark';
}

function DetailContent({ station, snapIndex, distanceKm, onClose }: { station: FuelStationFeature; snapIndex: number; distanceKm?: number; onClose: () => void }) {
  const { t } = useTranslation();
  const { name, brand, address, fuels, hours, schedule, services, paymentMethods, observations, otherServices, lastUpdated, extra, source } = station.properties;
  const [showPaymentTip, setShowPaymentTip] = useState(false);
  const entries = Object.entries(fuels ?? {}) as [string, number][];
  const locationParts = getLocationParts(station.properties);

  const handleCopyAddress = useCallback(() => {
    const formatted = formatStationAddress(station.properties);
    Clipboard.setStringAsync(formatted);
  }, [station.properties]);

  const handleOpenInMaps = useCallback(() => {
    const url = getMapsUrl(station);
    Linking.openURL(url);
  }, [station]);

  const { colorScheme } = useColorScheme();
  const secondaryLabel = colorScheme === 'dark' ? 'rgba(235, 235, 245, 0.75)' : 'rgba(60, 60, 67, 0.6)';

  return (
    <View className="gap-md p-lg">
      {/* === ALWAYS VISIBLE === */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-title-2 text-label dark:text-label-dark">
            {brand || name || t('common.unknown_station')}
          </Text>
          {brand && name && brand !== name && (
            <Text className="text-callout text-secondary-label dark:text-secondary-label-dark mt-0.5">
              {name}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-start">
        <View className="flex-1 mr-2">
          <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{cleanAddress(station.properties)}</Text>
          {locationParts.length > 0 && (
            <Text className="text-subheadline text-tertiary-label dark:text-tertiary-label-dark mt-0.5">
              {locationParts.join(', ')}
            </Text>
          )}
          {distanceKm !== undefined && (
            <Text className="text-subheadline text-tertiary-label dark:text-tertiary-label-dark mt-0.5">
              {distanceKm < 1
                ? `${(distanceKm * 1000).toFixed(0)} m`
                : `${distanceKm.toFixed(1)} km`} {t('station.from_location')}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={handleOpenInMaps} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View className="bg-surface dark:bg-surface-dark rounded-sm p-1.5">
              <Icon name="directions" size={19} color={secondaryLabel} />
            </View>
          </Pressable>
          <Pressable onPress={handleCopyAddress} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View className="bg-surface dark:bg-surface-dark rounded-sm p-1.5">
              <Icon name="copy" size={19} color={secondaryLabel} />
            </View>
          </Pressable>
        </View>
      </View>

      {entries.length > 0 && (
        <View className="flex-row flex-wrap gap-sm">
          {entries.map(([fuel, price]) => (
            <View key={fuel} className="bg-surface dark:bg-surface-dark rounded-md px-md py-sm min-w-[140px] flex-1 basis-[45%]">
              <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">
                {fuelLabel(fuel)}
              </Text>
              <Text className={`text-title-3 font-bold mt-0.5 ${priceColorClass(price)}`}>
                {price.toFixed(3)}{fuelUnit(fuel, source)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* === View Price History — always visible === */}
      {entries.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            router.push(`/price-trends/${station.properties.id}`);
          }}
          className="bg-tint rounded-md py-md items-center"
        >
          <Text className="text-white font-semibold text-callout">
            {t('station.view_price_history')}
          </Text>
        </TouchableOpacity>
      )}

      {/* === FULL CARD DETAILS — animated fade in/out === */}
      {snapIndex >= 1 && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
          <View className="gap-md">
            <View className="h-px bg-separator dark:bg-separator-dark" />

            {schedule || hours ? (
              <View>
                <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs uppercase tracking-wide">
                  {t('station.hours')}
                </Text>
                {schedule ? (
                  <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">
                    {formatSchedule(schedule)}
                  </Text>
                ) : (
                  <>
                    {hours.weekdays && <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{t('station.weekdays')}: {hours.weekdays}</Text>}
                    {hours.saturday && <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{t('station.saturday')}: {hours.saturday}</Text>}
                    {hours.sunday && <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{t('station.sunday')}: {hours.sunday}</Text>}
                    {hours.holiday && <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{t('station.holiday')}: {hours.holiday}</Text>}
                  </>)}
              </View>
            ) : null}

            {services?.length > 0 && (
              <View>
                <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs uppercase tracking-wide">
                  {t('station.services')}
                </Text>
<Text className="text-callout text-secondary-label dark:text-secondary-label-dark">
                   {Array.isArray(services) ? services.join(', ') : services}
                 </Text>
              </View>
            )}

            {paymentMethods?.length > 0 && (
              <View>
                <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs uppercase tracking-wide">
                  {t('station.payment_methods')}
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-callout text-secondary-label dark:text-secondary-label-dark flex-1">
                    {Array.isArray(paymentMethods) ? paymentMethods.map((pm: string) => `${t(`station.payment_${pm.toLowerCase()}`, { defaultValue: pm })}`).join(', ') : `${t(`station.payment_${(paymentMethods as string).toLowerCase()}`, { defaultValue: paymentMethods })}`}
                  </Text>
                  <Pressable onPress={() => setShowPaymentTip(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="info.circle" size={14} color={secondaryLabel} />
                  </Pressable>
                </View>
                {showPaymentTip && (
                  <Pressable onPress={() => setShowPaymentTip(false)}>
                    <View className="mt-2 p-md bg-surface dark:bg-surface-dark rounded-md border border-separator dark:border-separator-dark">
                      <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark">{t('station.payment_disclaimer')}</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            )}

            {(observations || otherServices || extra?.stationType || extra?.margin || lastUpdated) && (
              <View>
                <Text className="text-footnote text-label dark:text-label-dark font-semibold mb-xs uppercase tracking-wide">
                  {t('common.station')}
                </Text>
                {extra?.stationType && <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{t('station.station_type')}: {extra?.stationType}</Text>}
                {otherServices && <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{t('station.other_services')}: {otherServices}</Text>}
                {extra?.margin && <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{t('station.margin')}: {marginLabel(extra.margin)}</Text>}
                {observations && <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{observations}</Text>}
                {lastUpdated && <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">{t('station.last_updated')}: {lastUpdated}</Text>}
              </View>
            )}

          </View>
        </Animated.View>
      )}
    </View>
  );
}

export function StationDetailSheet() {
  const { selectedStation, setSelectedStation } = useUI();
  const { stationDistances } = useStations();
  const distanceKm = selectedStation ? stationDistances.get(selectedStation.properties.id) : undefined;
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);
  const [snapIndex, setSnapIndex] = useState(0);
  const snapPoints = useMemo(() => {
    const entries = Object.keys(selectedStation?.properties.fuels ?? {}).length;
    const rows = Math.ceil(entries / 2);
    const extraRows = Math.max(0, rows - 2);
    const firstSnap = Math.min(50 + extraRows * 7, 85);
    return [`${firstSnap}%`, '90%'];
  }, [selectedStation]);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  const handleReport = useCallback(() => {
    Linking.openURL(REPORT_ISSUE_URL);
  }, []);

  useEffect(() => {
    if (selectedStation && !isPresentedRef.current) {
      isPresentedRef.current = true;
      setSnapIndex(0);
      bottomSheetRef.current?.present();
    }
  }, [selectedStation]);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    setSnapIndex(0);
    setSelectedStation(null);
  }, [setSelectedStation]);

  const handleChange = useCallback((index: number) => {
    setSnapIndex(index);
  }, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture
      enableDynamicSizing
      onChange={handleChange}
      onDismiss={handleDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      }}
      handleIndicatorStyle={{ 
        backgroundColor: isDark ? 'rgba(235, 235, 245, 0.5)' : 'rgba(60, 60, 67, 0.3)' 
      }}
    >
      <View className="flex-1">
        <BottomSheetScrollView>
          {selectedStation ? (
            <DetailContent
              station={selectedStation}
              snapIndex={snapIndex}
              distanceKm={distanceKm}
              onClose={() => bottomSheetRef.current?.dismiss()}
            />
          ) : (
            <View />
          )}
        </BottomSheetScrollView>
        {selectedStation && snapIndex >= 1 && (
          <View className="border-t border-separator dark:border-separator-dark px-lg pt-sm pb-lg">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleReport}
              className="bg-surface dark:bg-surface-dark border border-separator dark:border-separator-dark rounded-md py-md items-center flex-row justify-center gap-sm"
            >
              <Icon name="flag" size={16} color={isDark ? '#22B8CD' : '#0C8599'} />
              <Text className="text-tint dark:text-tint-dark font-semibold text-callout">
                {t('station.report_incorrect_info')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
}
