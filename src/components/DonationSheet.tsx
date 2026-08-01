import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { SUPPORT } from '../config/support';
import { Icon } from '../theme/Icon';

export type DonationSheetHandle = { present: () => void };

const OPTIONS = [
  {
    key: 'github',
    titleKey: 'settings.donate_github',
    captionKey: 'settings.donate_github_caption',
    feeKey: 'settings.donate_github_fee',
    icon: 'github' as const,
    url: SUPPORT.githubSponsorsUrl,
  },
  {
    key: 'kofi',
    titleKey: 'settings.donate_kofi',
    captionKey: 'settings.donate_kofi_caption',
    feeKey: 'settings.donate_kofi_fee',
    icon: 'kofi' as const,
    url: SUPPORT.kofiUrl,
  },
];

export const DonationSheet = forwardRef<DonationSheetHandle, object>(function DonationSheet(
  _props,
  ref,
) {
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['52%'], []);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useImperativeHandle(ref, () => ({
    present: () => bottomSheetRef.current?.present(),
  }));

  const handleOpen = useCallback((url: string) => {
    bottomSheetRef.current?.dismiss();
    Linking.openURL(url).catch(() => {});
  }, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableDynamicSizing={false}
      handleStyle={{ marginVertical: 4 }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? 'rgba(235, 235, 245, 0.3)' : 'rgba(60, 60, 67, 0.3)',
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-title2 font-semibold text-label dark:text-label-dark mb-sm">
          {t('settings.donate_title')}
        </Text>
        <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark mb-lg">
          {t('settings.donate_caption')}
        </Text>

        {OPTIONS.map((option, idx) => (
          <View key={option.key} className="mb-md">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleOpen(option.url)}
              className="flex-row items-center justify-between py-md px-sm rounded-md bg-field-background dark:bg-field-background-dark"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-sm"
                  style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
                >
                  <Icon name={option.icon} size={20} color="#0C8599" />
                </View>
                <View className="flex-1">
                  <Text className="text-body text-label dark:text-label-dark font-semibold">
                    {t(option.titleKey)}
                  </Text>
                  <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
                    {t(option.captionKey)}
                  </Text>
                </View>
              </View>
              <Text className="text-tint dark:text-tint-dark text-body ml-sm">›</Text>
            </TouchableOpacity>
            <Text className="text-caption2 text-tertiary-label dark:text-tertiary-label-dark px-sm pt-xs">
              {t(option.feeKey)}
            </Text>
            {idx < OPTIONS.length - 1 && (
              <View className="h-px bg-separator dark:bg-separator-dark my-sm" />
            )}
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
