import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

import { Icon } from '../theme/Icon';
import { useUserLocationMarker, type UserLocationMarkerConfig } from '../hooks/useUserLocationMarker';
import { svgMarkers, SVG_MARKER_NAMES, SVG_REWARD_NAMES } from './userLocationMarkers';

export type LocationMarkerSheetHandle = { present: () => void };

interface LocationMarkerSheetProps {
  isSvgUnlocked?: (name: string) => boolean;
  onRequestUnlockSvg?: (name: string) => void;
}

export const LocationMarkerSheet = forwardRef<LocationMarkerSheetHandle, LocationMarkerSheetProps>(
  function LocationMarkerSheet({ isSvgUnlocked, onRequestUnlockSvg }, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['50%'], []);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const bg = isDark ? '#1C1C1E' : '#FFFFFF';
    const tint = '#0C8599';

    const { marker: currentMarker, setMarker, availableIcons } = useUserLocationMarker();

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
    }));

    const handleSelectIcon = useCallback((name: string) => {
      Haptics.selectionAsync();
      setMarker({ type: 'icon', value: name });
      bottomSheetRef.current?.dismiss();
    }, [setMarker]);

    const handleSelectSvg = useCallback((name: string) => {
      setMarker({ type: 'svg', value: name });
      bottomSheetRef.current?.dismiss();
    }, [setMarker]);

    const handlePickImage = useCallback(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setMarker({ type: 'image', value: result.assets[0].uri });
        bottomSheetRef.current?.dismiss();
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
        handleStyle={{ marginVertical: 8 }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? 'rgba(235, 235, 245, 0.3)' : 'rgba(60, 60, 67, 0.3)',
          width: 40,
          height: 5,
          borderRadius: 3,
          alignSelf: 'center',
          marginVertical: 8,
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ backgroundColor: bg }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <Text className="text-title2 font-semibold text-label dark:text-label-dark mb-lg">
            {t('settings.location_marker')}
          </Text>

          {/* Icons section */}
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
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
                    backgroundColor: bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 3,
                    elevation: 3,
                    borderWidth: selected ? 2.5 : 0,
                    borderColor: selected ? tint : 'transparent',
                  }}>
                    <Icon name={name} size={26} color={tint} />
                  </View>
                  <Text className="text-caption1 text-secondary-label dark:text-secondary-label-dark text-center">
                    {name.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* SVG section */}
          {SVG_MARKER_NAMES.length > 0 && (
            <>
              <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
                {t('settings.marker_svg')}
              </Text>
              <View className="flex-row flex-wrap gap-md mb-xl">
                {SVG_MARKER_NAMES.map((name) => {
                  const SvgComponent = svgMarkers[name];
                  const selected = isSelected({ type: 'svg', value: name });
                  const isReward = SVG_REWARD_NAMES.includes(name as (typeof SVG_REWARD_NAMES)[number]);
                  const unlocked = !isReward || (isSvgUnlocked ? isSvgUnlocked(name) : true);
                  return (
                    <TouchableOpacity
                      key={name}
                      activeOpacity={0.7}
                      onPress={() => (unlocked ? handleSelectSvg(name) : onRequestUnlockSvg?.(name))}
                      className="items-center gap-xs"
                      style={{ width: '22%' }}
                    >
                      <View style={{
                        width: 54,
                        height: 54,
                        borderRadius: 27,
                        backgroundColor: bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.15,
                        shadowRadius: 3,
                        elevation: 3,
                        borderWidth: selected ? 2.5 : 0,
                        borderColor: selected ? tint : 'transparent',
                        opacity: unlocked ? 1 : 0.4,
                      }}>
                        {SvgComponent && <SvgComponent size={26} color={tint} />}
                        {!unlocked && (
                          <View style={{
                            position: 'absolute',
                            right: 4,
                            bottom: 4,
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: isDark ? '#3A3A3C' : '#FFFFFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Icon name="lock" size={11} color={tint} />
                          </View>
                        )}
                      </View>
                      <Text className="text-caption1 text-secondary-label dark:text-secondary-label-dark text-center">
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Custom Image section */}
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
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
                className="flex-row items-center justify-center py-md px-lg rounded-lg"
                style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
              >
                <Text className="text-body text-label dark:text-label-dark">
                  {t('settings.marker_change_image')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickImage}
              className="flex-row items-center justify-center py-md px-lg rounded-lg mb-xl"
              style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
            >
              <View style={{ marginRight: 8 }}>
                <Icon name="my_location" size={18} color={tint} />
              </View>
              <Text className="text-body text-label dark:text-label-dark">
                {t('settings.marker_import_image')}
              </Text>
            </TouchableOpacity>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
