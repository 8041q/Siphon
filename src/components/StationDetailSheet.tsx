import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Linking, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { FuelStationFeature } from '../api/siphonClient';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';
import { formatSchedule, marginLabel } from '../utils/schedule';
import { cleanAddress, getLocationParts, formatStationAddress, getMapsUrl } from '../utils/location';
import { Icon } from '../theme/Icon';
import { useUI, useStations } from '../hooks/useApp';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { WorthTheDrive } from './WorthTheDrive';

const REPORT_ISSUE_URL = 'https://github.com/8041q/SiphonAPI/issues/new?template=incorrect-station-info.yml';

function priceColorStyle(price: number, colors: { priceLow: string; priceMid: string; priceHigh: string }): { color: string } {
  if (price < 1.65) return { color: colors.priceLow };
  if (price < 1.87) return { color: colors.priceMid };
  return { color: colors.priceHigh };
}

function DetailContent({ station, snapIndex, distanceKm, distanceLoading, onClose }: { station: FuelStationFeature; snapIndex: number; distanceKm?: number; distanceLoading?: boolean; onClose: () => void }) {
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

  const { colors } = useThemeTokens();

  return (
    <View className="gap-md p-lg">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text style={{ color: colors.label }} className="text-title-2">
            {brand || name || t('common.unknown_station')}
          </Text>
          {brand && name && brand !== name && (
            <Text style={{ color: colors.secondaryLabel }} className="text-callout mt-0.5">
              {name}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-start">
        <View className="flex-1 mr-2">
          <Text style={{ color: colors.secondaryLabel }} className="text-callout">{cleanAddress(station.properties)}</Text>
          {locationParts.length > 0 && (
            <Text style={{ color: colors.tertiaryLabel }} className="text-subheadline mt-0.5">
              {locationParts.join(', ')}
            </Text>
          )}
          {distanceKm !== undefined && (
            <View className="flex-row items-center gap-1 mt-0.5">
              <Text style={{ color: colors.tertiaryLabel }} className="text-subheadline">
                {distanceKm < 1
                  ? `${(distanceKm * 1000).toFixed(0)} m`
                  : `${distanceKm.toFixed(1)} km`}{' '}
                {t('station.from_location')}
              </Text>
              {distanceLoading && (
                <Text style={{ color: colors.priceMid }} className="text-[10px]">
                  ({t('station.distance_optimizing')})
                </Text>
              )}
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={handleOpenInMaps} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={{ backgroundColor: colors.surface }} className="rounded-sm p-1.5">
              <Icon name="directions" size={19} color={colors.secondaryLabel} />
            </View>
          </Pressable>
          <Pressable onPress={handleCopyAddress} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={{ backgroundColor: colors.surface }} className="rounded-sm p-1.5">
              <Icon name="copy" size={19} color={colors.secondaryLabel} />
            </View>
          </Pressable>
        </View>
      </View>

      {entries.length > 0 && (
        <View className="flex-row flex-wrap gap-sm">
          {entries.map(([fuel, price]) => (
            <View key={fuel} style={{ backgroundColor: colors.surface }} className="rounded-md px-md py-sm min-w-[140px] flex-1 basis-[45%]">
              <Text style={{ color: colors.secondaryLabel }} className="text-callout">
                {fuelLabel(fuel)}
              </Text>
              <Text style={priceColorStyle(price, colors)} className="text-title-3 font-bold mt-0.5">
                {price.toFixed(3)}{fuelUnit(fuel, source)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {entries.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              router.push(`/price-trends/${station.properties.id}`);
            }}
            style={{ backgroundColor: colors.tint }}
            className="rounded-md py-md items-center"
          >
            <Text style={{ color: colors.labelOnTint }} className="font-semibold text-callout">
              {t('station.view_price_history')}
            </Text>
          </TouchableOpacity>
      )}

      {snapIndex >= 1 && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
          <View className="gap-md">
            {distanceKm !== undefined && <WorthTheDrive station={station} distanceKm={distanceKm} />}

            <View style={{ backgroundColor: colors.separator }} className="h-px" />

            {schedule || hours ? (
              <View>
                <Text style={{ color: colors.label }} className="text-footnote font-semibold mb-xs uppercase tracking-wide">
                  {t('station.hours')}
                </Text>
                {schedule ? (
                  <Text style={{ color: colors.secondaryLabel }} className="text-callout">
                    {formatSchedule(schedule)}
                  </Text>
                ) : (
                  <>
                    {hours.weekdays && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.weekdays')}: {hours.weekdays}</Text>}
                    {hours.saturday && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.saturday')}: {hours.saturday}</Text>}
                    {hours.sunday && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.sunday')}: {hours.sunday}</Text>}
                    {hours.holiday && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.holiday')}: {hours.holiday}</Text>}
                  </>)}
              </View>
            ) : null}

            {services?.length > 0 && (
              <View>
                <Text style={{ color: colors.label }} className="text-footnote font-semibold mb-xs uppercase tracking-wide">
                  {t('station.services')}
                </Text>
                <Text style={{ color: colors.secondaryLabel }} className="text-callout">
                  {Array.isArray(services) ? services.join(', ') : services}
                </Text>
              </View>
            )}

            {paymentMethods?.length > 0 && (
              <View>
                <Text style={{ color: colors.label }} className="text-footnote font-semibold mb-xs uppercase tracking-wide">
                  {t('station.payment_methods')}
                </Text>
                <View className="flex-row items-center">
                  <Text style={{ color: colors.secondaryLabel }} className="text-callout flex-1">
                    {Array.isArray(paymentMethods) ? paymentMethods.map((pm: string) => `${t(`station.payment_${pm.toLowerCase()}`, { defaultValue: pm })}`).join(', ') : `${t(`station.payment_${(paymentMethods as string).toLowerCase()}`, { defaultValue: paymentMethods })}`}
                  </Text>
                  <Pressable onPress={() => setShowPaymentTip(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="info.circle" size={14} color={colors.secondaryLabel} />
                  </Pressable>
                </View>
                {showPaymentTip && (
                  <Pressable onPress={() => setShowPaymentTip(false)}>
                    <View style={{ backgroundColor: colors.surface, borderColor: colors.separator }} className="mt-2 p-md rounded-md border">
                      <Text style={{ color: colors.tertiaryLabel }} className="text-footnote">{t('station.payment_disclaimer')}</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            )}

            {(observations || otherServices || extra?.stationType || extra?.margin || lastUpdated) && (
              <View>
                <Text style={{ color: colors.label }} className="text-footnote font-semibold mb-xs uppercase tracking-wide">
                  {t('common.station')}
                </Text>
                {extra?.stationType && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.station_type')}: {extra?.stationType}</Text>}
                {otherServices && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.other_services')}: {otherServices}</Text>}
                {extra?.margin && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.margin')}: {marginLabel(extra.margin)}</Text>}
                {observations && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{observations}</Text>}
                {lastUpdated && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.last_updated')}: {lastUpdated}</Text>}
              </View>
            )}

            <View>
              <Text style={{ color: colors.label }} className="text-footnote font-semibold mb-xs uppercase tracking-wide">
                {t('station.id')}
              </Text>
              <Text style={{ color: colors.secondaryLabel }} className="text-callout">
                {station.properties.id}
              </Text>
            </View>

          </View>
        </Animated.View>
      )}
    </View>
  );
}

export function StationDetailSheet() {
  const { selectedStation, setSelectedStation } = useUI();
  const { stationDistances, distanceLoading } = useStations();
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

  const { colors } = useThemeTokens();
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
      enableContentPanningGesture={false}
      enableDynamicSizing
      maxDynamicContentSize={Math.round(Dimensions.get('window').height * 0.9)}
      handleStyle={{ marginVertical: 4 }}
      handleIndicatorStyle={{
        backgroundColor: colors.handleIndicator,
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
      }}
      onChange={handleChange}
      onDismiss={handleDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{
        backgroundColor: colors.sheet,
      }}
    >
      <View className="flex-1">
        <BottomSheetScrollView>
          {selectedStation ? (
            <DetailContent
              station={selectedStation}
              snapIndex={snapIndex}
              distanceKm={distanceKm}
              distanceLoading={distanceLoading}
              onClose={() => bottomSheetRef.current?.dismiss()}
            />
          ) : (
            <View />
          )}
        </BottomSheetScrollView>
        {selectedStation && snapIndex >= 1 && (
          <View style={{ borderColor: colors.separator }} className="px-lg pt-sm pb-lg">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleReport}
              style={{ backgroundColor: colors.surface, borderColor: colors.separator }}
              className="rounded-md py-md items-center flex-row justify-center gap-sm"
            >
              <Icon name="flag" size={16} color={colors.tint} />
              <Text style={{ color: colors.tint }} className="font-semibold text-callout">
                {t('station.report_incorrect_info')}
              </Text>
            </TouchableOpacity>
            <Text style={{ color: colors.tertiaryLabel }} className="text-footnote text-center mt-xs">
              {t('station.report_hint')}
            </Text>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
}