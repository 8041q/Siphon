import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

import { Icon } from '../theme/Icon';
import { type UserLocationMarkerConfig, saveMarkerImage } from '../hooks/useUserLocationMarker';
import { useSupport } from '../hooks/useSupport';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { svgMarkers, SVG_MARKER_NAMES } from './userLocationMarkers';
import { SheetBackground } from './ui/SheetBackground';

export type LocationMarkerSheetHandle = { present: () => void };

const LOCKED_NOTICE_MS = 1800;

interface LocationMarkerSheetProps {
  /**
   * Fired when a locked reward marker is tapped, purely as a notification
   * This must never trigger an ad watch or unlock anything itself
   * Ads only ever play from the explicit "Watch an ad" button in the Rewards sheet.
   */
  onRequestUnlockSvg?: (name: string) => void;
}

export const LocationMarkerSheet = forwardRef<LocationMarkerSheetHandle, LocationMarkerSheetProps>(
  function LocationMarkerSheet({ onRequestUnlockSvg }, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['50%'], []);
    const { colors } = useThemeTokens();

    const { marker: currentMarker, setMarker, availableIcons, isUnlocked } = useSupport();
    const [lockedNoticeName, setLockedNoticeName] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
    }));

    const handleSelectIcon = useCallback((name: string) => {
      Haptics.selectionAsync();
      setMarker({ type: 'icon', value: name });
      bottomSheetRef.current?.dismiss();
    }, [setMarker]);

    const handleSelectSvg = useCallback((name: string) => {
      Haptics.selectionAsync();
      setMarker({ type: 'svg', value: name });
      bottomSheetRef.current?.dismiss();
    }, [setMarker]);

    const handleLockedSvgTap = useCallback((name: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLockedNoticeName(name);
      setTimeout(() => setLockedNoticeName((current) => (current === name ? null : current)), LOCKED_NOTICE_MS);
      onRequestUnlockSvg?.(name);
    }, [onRequestUnlockSvg]);

    const handlePickImage = useCallback(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const savedUri = await saveMarkerImage(result.assets[0].uri);
        if (savedUri) {
          setMarker({ type: 'image', value: savedUri });
          bottomSheetRef.current?.dismiss();
        }
      }
    }, [setMarker]);

    const isSelected = useCallback((config: UserLocationMarkerConfig) => {
      return currentMarker.type === config.type && currentMarker.value === config.value;
    }, [currentMarker]);

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        handleStyle={{ marginVertical: 4 }}
        handleIndicatorStyle={{
          backgroundColor: colors.handleIndicator,
          width: 40,
          height: 5,
          borderRadius: 3,
          alignSelf: 'center',
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundComponent={SheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ color: colors.label }} className="text-title2 font-semibold mb-lg">
            {t('settings.location_marker')}
          </Text>

          {/* Icons section */}
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
            {t('settings.marker_icons')}
          </Text>
          <View className="flex-row flex-wrap gap-md mb-xl">
            {availableIcons.map((name) => {
              const selected = isSelected({ type: 'icon', value: name });
              return (
                <TouchableOpacity
                  key={name}
                  activeOpacity={0.7}
                  onPress={() => handleSelectIcon(name)}
                  className="items-center gap-xs"
                  style={{ width: '22%' }}
                >
                  <View style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    backgroundColor: colors.sheet,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 3,
                    elevation: 3,
                    borderWidth: selected ? 2.5 : 0,
                    borderColor: selected ? colors.tint : 'transparent',
                  }}>
                    <Icon name={name} size={26} color={colors.tint} />
                  </View>
                  <Text style={{ color: colors.secondaryLabel }} className="text-caption1 text-center">
                    {name.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* SVG section */}
          {SVG_MARKER_NAMES.length > 0 && (
            <>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('settings.marker_svg')}
              </Text>
              <View className="flex-row flex-wrap gap-md mb-xl">
                {SVG_MARKER_NAMES.map((name) => {
                  const SvgComponent = svgMarkers[name];
                  const selected = isSelected({ type: 'svg', value: name });
                  const unlocked = isUnlocked(name);
                  return (
                    <TouchableOpacity
                      key={name}
                      activeOpacity={0.7}
                      onPress={() => (unlocked ? handleSelectSvg(name) : handleLockedSvgTap(name))}
                      className="items-center gap-xs"
                      style={{ width: '22%' }}
                    >
                      <View style={{
                        width: 54,
                        height: 54,
                        borderRadius: 27,
                        backgroundColor: colors.sheet,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.15,
                        shadowRadius: 3,
                        elevation: 3,
                        borderWidth: selected ? 2.5 : 0,
                        borderColor: selected ? colors.tint : 'transparent',
                        opacity: unlocked ? 1 : 0.4,
                      }}>
                        {SvgComponent && <SvgComponent size={26} color={colors.tint} />}
                        {!unlocked && (
                          <View style={{
                            position: 'absolute',
                            right: 4,
                            bottom: 4,
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: colors.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Icon name="lock" size={11} color={colors.tint} />
                          </View>
                        )}
                      </View>
                      <Text
                        className="text-caption1 text-center"
                        style={{
                          color: lockedNoticeName === name ? colors.priceHigh : colors.secondaryLabel,
                          fontWeight: lockedNoticeName === name ? '600' : undefined,
                        }}
                      >
                        {lockedNoticeName === name ? t('settings.reward_locked_notice') : name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Custom Image section */}
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
            {t('settings.marker_image')}
          </Text>
          {currentMarker.type === 'image' ? (
            <View className="items-center mb-xl">
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                overflow: 'hidden',
                borderWidth: 2.5,
                borderColor: '#FFFFFF',
                marginBottom: 12,
              }}>
                <Image
                  source={{ uri: currentMarker.value }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePickImage}
                style={{ backgroundColor: colors.groupedBackground }}
                className="flex-row items-center justify-center py-md px-lg rounded-lg"
              >
                <Text style={{ color: colors.label }} className="text-body">
                  {t('settings.marker_change_image')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickImage}
              style={{ backgroundColor: colors.groupedBackground }}
              className="flex-row items-center justify-center py-md px-lg rounded-lg mb-xl"
            >
              <View style={{ marginRight: 8 }}>
                <Icon name="my_location" size={18} color={colors.tint} />
              </View>
              <Text style={{ color: colors.label }} className="text-body">
                {t('settings.marker_import_image')}
              </Text>
            </TouchableOpacity>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
