import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';

import { SUPPORT } from '../config/support';
import { Icon } from '../theme/Icon';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { SheetBackground } from './ui/SheetBackground';

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

  const { colors } = useThemeTokens();

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
        <Text style={{ color: colors.label }} className="text-title2 font-semibold mb-sm">
          {t('settings.donate_title')}
        </Text>
        <Text style={{ color: colors.secondaryLabel }} className="text-footnote mb-lg">
          {t('settings.donate_caption')}
        </Text>

        {OPTIONS.map((option, idx) => (
          <View key={option.key} className="mb-md">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleOpen(option.url)}
              style={{ backgroundColor: colors.fieldBackground }}
              className="flex-row items-center justify-between py-md px-sm rounded-md"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-sm"
                  style={{ backgroundColor: colors.groupedBackground }}
                >
                  <Icon name={option.icon} size={20} color={colors.tint} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.label }} className="text-body font-semibold">
                    {t(option.titleKey)}
                  </Text>
                  <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
                    {t(option.captionKey)}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.tint }} className="text-body ml-sm">›</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.tertiaryLabel }} className="text-caption2 px-sm pt-xs">
              {t(option.feeKey)}
            </Text>
            {idx < OPTIONS.length - 1 && (
              <View style={{ backgroundColor: colors.separator }} className="h-px my-sm" />
            )}
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
