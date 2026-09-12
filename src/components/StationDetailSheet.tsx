import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FuelKey, FuelStationFeature } from '../api/siphonClient';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';
import { formatSchedule, marginLabel } from '../utils/schedule';
import { cleanAddress, getLocationParts, formatStationAddress, getMapsUrl } from '../utils/location';
import { Icon } from '../theme/Icon';
import { useUI, useStationDistances } from '../hooks/useApp';
import { useBottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { SHEET_HANDLE_STYLE, SHEET_HANDLE_INDICATOR_STYLE } from '../theme/layout';
import { WorthTheDrive } from './WorthTheDrive';
import { SheetBackground } from './ui/SheetBackground';
import { GlassBox } from './ui/GlassBox';

const REPORT_ISSUE_URL = 'https://github.com/8041q/SiphonAPI/issues/new?template=incorrect-station-info.yml';

function priceColorStyle(price: number, colors: { priceLow: string; priceMid: string; priceHigh: string }): { color: string } {
  if (price < 1.65) return { color: colors.priceLow };
  if (price < 1.87) return { color: colors.priceMid };
  return { color: colors.priceHigh };
}

function DetailContent({ station, snapIndex, distanceKm, distanceLoading, distanceRouted = false, onClose }: { station: FuelStationFeature; snapIndex: number; distanceKm?: number; distanceLoading?: boolean; distanceRouted?: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { name, brand, address, fuels, hours, schedule, services, paymentMethods, observations, otherServices, lastUpdated, extra, source } = station.properties;
  const [showPaymentTip, setShowPaymentTip] = useState(false);
  const entries = Object.entries(fuels) as [FuelKey, number][];
  const locationParts = getLocationParts(station.properties);
  const { favorites, toggleFavorite } = useUI();
  const favorite = favorites?.has(station.properties.id) ?? false;
  const displayName = brand || name || t('common.unknown_station');

  const handleCopyAddress = useCallback(() => {
    const formatted = formatStationAddress(station.properties);
    void Clipboard.setStringAsync(formatted).catch(() => undefined);
  }, [station.properties]);

  const handleOpenInMaps = useCallback(() => {
    const url = getMapsUrl(station);
    void Linking.openURL(url).catch(() => undefined);
  }, [station]);

  const { colors } = useThemeTokens();

  return (
    <View className="gap-md p-lg">
      <View className="flex-row items-start justify-between">
        <View className="flex-1" style={{ marginEnd: 8 }}>
          <Text style={{ color: colors.label }} className="text-title-2">
            {displayName}
          </Text>
          {brand && name && brand !== name && (
            <Text style={{ color: colors.secondaryLabel }} className="text-callout mt-0.5">
              {name}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => toggleFavorite(station)}
          style={{ padding: 4 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${favorite ? t('station.remove_favorite') : t('station.add_favorite')}: ${displayName}`}
          accessibilityState={{ selected: favorite }}
        >
          <View className="rounded-sm p-1.5">
            <Icon
              name={favorite ? 'star.fill' : 'star'}
              size={19}
              color={favorite ? colors.favorite : colors.tertiaryLabel}
            />
          </View>
        </Pressable>
      </View>

      <View className="flex-row items-start">
        <View className="flex-1" style={{ marginEnd: 8 }}>
          <Text style={{ color: colors.secondaryLabel }} className="text-callout">{cleanAddress(station.properties)}</Text>
          {locationParts.length > 0 && (
            <Text style={{ color: colors.tertiaryLabel }} className="text-subheadline mt-0.5">
              {locationParts.join(', ')}
            </Text>
          )}
          {distanceKm !== undefined && (
            <View className="flex-row items-center gap-1 mt-0.5">
              <Text style={{ color: colors.tertiaryLabel }} className="text-subheadline">
                {!distanceRouted ? '~' : ''}{distanceKm < 1
                  ? `${(distanceKm * 1000).toFixed(0)} m`
                  : `${distanceKm.toFixed(1)} km`}{' '}
                {t('station.from_location')}
              </Text>
              {distanceLoading && !distanceRouted && (
                <Text style={{ color: colors.priceMid }} className="text-[10px]">
                  ({t('station.distance_optimizing')})
                </Text>
              )}
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={handleOpenInMaps}
            style={{ padding: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('station.open_in_maps')}
          >
            <GlassBox component="card" className="rounded-sm p-1.5">
              <Icon name="directions" size={19} color={colors.secondaryLabel} />
            </GlassBox>
          </Pressable>
          <Pressable
            onPress={handleCopyAddress}
            style={{ padding: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('station.copy_address')}
          >
            <GlassBox component="card" className="rounded-sm p-1.5">
              <Icon name="copy" size={19} color={colors.secondaryLabel} />
            </GlassBox>
          </Pressable>
        </View>
      </View>

      {entries.length > 0 && (
        <View className="flex-row flex-wrap gap-sm">
          {entries.map(([fuel, price]) => (
            <GlassBox key={fuel} component="card" className="rounded-md px-md py-sm min-w-[140px] flex-1 basis-[45%]">
              <Text style={{ color: colors.secondaryLabel }} className="text-callout">
                {fuelLabel(fuel)}
              </Text>
              <Text style={priceColorStyle(price, colors)} className="text-title-3 font-bold mt-0.5">
                {price.toFixed(3)}{fuelUnit(fuel, source)}
              </Text>
            </GlassBox>
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
            accessibilityRole="button"
            accessibilityLabel={t('station.view_price_history')}
          >
            <Text style={{ color: colors.labelOnTint }} className="font-semibold text-callout">
              {t('station.view_price_history')}
            </Text>
          </TouchableOpacity>
      )}

      {snapIndex >= 1 && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
          <View className="gap-md">
            {distanceKm !== undefined && <WorthTheDrive station={station} distanceKm={distanceKm} distanceRouted={distanceRouted} />}

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
                    {hours?.weekdays && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.weekdays')}: {hours?.weekdays}</Text>}
                    {hours?.saturday && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.saturday')}: {hours?.saturday}</Text>}
                    {hours?.sunday && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.sunday')}: {hours?.sunday}</Text>}
                    {hours?.holiday && <Text style={{ color: colors.secondaryLabel }} className="text-callout">{t('station.holiday')}: {hours?.holiday}</Text>}
                  </>)}
              </View>
            ) : null}

            {services && services.length > 0 && (
              <View>
                <Text style={{ color: colors.label }} className="text-footnote font-semibold mb-xs uppercase tracking-wide">
                  {t('station.services')}
                </Text>
                <Text style={{ color: colors.secondaryLabel }} className="text-callout">
                  {services.join(', ')}
                </Text>
              </View>
            )}

            {paymentMethods && paymentMethods.length > 0 && (
              <View>
                <Text style={{ color: colors.label }} className="text-footnote font-semibold mb-xs uppercase tracking-wide">
                  {t('station.payment_methods')}
                </Text>
                <View className="flex-row items-center">
                  <Text style={{ color: colors.secondaryLabel }} className="text-callout flex-1">
                    {paymentMethods
                      .map((method) => t(`station.payment_${method.toLowerCase()}`, { defaultValue: method }))
                      .join(', ')}
                  </Text>
                  <Pressable
                    onPress={() => setShowPaymentTip(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('station.payment_info')}
                  >
                    <Icon name="info.circle" size={14} color={colors.secondaryLabel} />
                  </Pressable>
                </View>
                {showPaymentTip && (
                  <Pressable
                    onPress={() => setShowPaymentTip(false)}
                    accessibilityRole="button"
                    accessibilityLabel={t('station.payment_disclaimer')}
                  >
                    <GlassBox component="card" color={colors.surface} style={{ borderColor: colors.separator }} className="mt-2 p-md rounded-md border">
                      <Text style={{ color: colors.tertiaryLabel }} className="text-footnote">{t('station.payment_disclaimer')}</Text>
                    </GlassBox>
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
  const { stationDistances, routedStationIds, distanceLoading } = useStationDistances();
  const distanceKm = selectedStation ? stationDistances.get(selectedStation.properties.id) : undefined;
  const distanceRouted = selectedStation ? routedStationIds.has(selectedStation.properties.id) : false;
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { handleSheetChange: handleBackSheetChange, handleSheetDismiss: handleBackSheetDismiss } = useBottomSheetBackHandler(bottomSheetRef);
  const isPresentedRef = useRef(false);
  const lastPresentedIdRef = useRef<string | null>(null);
  const [snapIndex, setSnapIndex] = useState(0);
  const snapPoints = useMemo(() => {
    const entries = Object.keys(selectedStation?.properties.fuels ?? {}).length;
    const rows = Math.ceil(entries / 2);
    const extraRows = Math.max(0, rows - 2);
    const firstSnap = Math.min(50 + extraRows * 7, 85);
    return [`${firstSnap}%`, '100%'];
  }, [selectedStation]);

  const { colors } = useThemeTokens();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleReport = useCallback(() => {
    void Linking.openURL(REPORT_ISSUE_URL).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedStation) return;
    lastPresentedIdRef.current = selectedStation.properties.id;
    if (isPresentedRef.current) return;
    setSnapIndex(0);

    // Defer present() so it never collides with an in-flight dismiss animation.
    // Mark the sheet as presented only when the deferred frame actually runs;
    // otherwise a cancelled frame can leave the ref stuck in a false-open state.
    const frame = requestAnimationFrame(() => {
      if (!bottomSheetRef.current) return;
      isPresentedRef.current = true;
      bottomSheetRef.current.present();
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedStation]);

  const handleDismiss = useCallback(() => {
    handleBackSheetDismiss();
    isPresentedRef.current = false;
    setSnapIndex(0);
    // Only clear the selection if it's still the station this sheet presented.
    // If the user tapped a different station while dismissing the old sheet,
    // keep that newer selection so the effect re-presents it on the next pass.
    if (selectedStation && selectedStation.properties.id === lastPresentedIdRef.current) {
      setSelectedStation(null);
    }
  }, [handleBackSheetDismiss, setSelectedStation, selectedStation]);

  const handleChange = useCallback((index: number) => {
    handleBackSheetChange(index);
    setSnapIndex(index);
  }, [handleBackSheetChange]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableDynamicSizing={false}
      topInset={insets.top}
      bottomInset={0}
      handleStyle={SHEET_HANDLE_STYLE}
        handleIndicatorStyle={[
          SHEET_HANDLE_INDICATOR_STYLE,
          { backgroundColor: colors.handleIndicator },
        ]}
      onChange={handleChange}
      onDismiss={handleDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundComponent={SheetBackground}
    >
      <View className="flex-1">
        <BottomSheetScrollView>
          {selectedStation ? (
            <DetailContent
              station={selectedStation}
              snapIndex={snapIndex}
              distanceKm={distanceKm}
              distanceLoading={distanceLoading}
              distanceRouted={distanceRouted}
              onClose={() => bottomSheetRef.current?.dismiss()}
            />
          ) : (
            <View />
          )}
        </BottomSheetScrollView>
        {selectedStation && snapIndex >= 1 && (
          <View style={{ borderColor: colors.separator }} className="px-lg pt-sm pb-lg">
            <GlassBox component="card" className="rounded-md overflow-hidden">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleReport}
                style={{ borderColor: colors.separator }}
                className="rounded-md py-md items-center flex-row justify-center gap-sm"
                accessibilityRole="button"
                accessibilityLabel={t('station.report_incorrect_info')}
              >
                <Icon name="flag" size={16} color={colors.tint} />
                <Text style={{ color: colors.tint }} className="font-semibold text-callout">
                  {t('station.report_incorrect_info')}
                </Text>
              </TouchableOpacity>
            </GlassBox>
            <Text style={{ color: colors.tertiaryLabel }} className="text-footnote text-center mt-xs">
              {t('station.report_hint')}
            </Text>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
}