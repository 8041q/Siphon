import { useAppearanceLayout } from '../hooks/useAppearanceLayout';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { useBottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import { SHEET_HANDLE_STYLE, SHEET_HANDLE_INDICATOR_STYLE } from '../theme/layout';
import { SheetBackground } from './ui/SheetBackground';
import { SheetBackdrop } from './ui/SheetBackdrop';
import { Button } from './ui/button';

type ThemePref = 'system' | 'light' | 'dark';

interface ThemeOption {
  value: ThemePref;
  labelKey: string;
}

const THEMES: ThemeOption[] = [
  { value: 'system', labelKey: 'settings.theme_system' },
  { value: 'light', labelKey: 'settings.theme_light' },
  { value: 'dark', labelKey: 'settings.theme_dark' },
];

interface ThemeSheetProps {
  currentTheme: ThemePref;
  onSelectTheme: (pref: ThemePref) => void;
  onDismiss: () => void;
}

export type ThemeSheetHandle = { present: () => void };

export const ThemeSheet = forwardRef<ThemeSheetHandle, ThemeSheetProps>(
  function ThemeSheet({ currentTheme, onSelectTheme, onDismiss }, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const { handleSheetChange, handleSheetDismiss } = useBottomSheetBackHandler(bottomSheetRef);
    const snapPoints = useMemo(() => ['35%'], []);

    const { colors } = useThemeTokens();
    const { space } = useAppearanceLayout();
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
    }));

    const handleSelect = useCallback((pref: ThemePref) => {
      void Haptics.selectionAsync().catch(() => undefined);
      onSelectTheme(pref);
    }, [onSelectTheme]);

    const handleDismiss = useCallback(() => {
      handleSheetDismiss();
      onDismiss();
    }, [handleSheetDismiss, onDismiss]);

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        accessible={false}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        handleStyle={SHEET_HANDLE_STYLE}
        handleIndicatorStyle={[
          SHEET_HANDLE_INDICATOR_STYLE,
          { backgroundColor: colors.handleIndicator },
        ]}
        onChange={handleSheetChange}
        onDismiss={handleDismiss}
        backdropComponent={SheetBackdrop}
        backgroundComponent={SheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.lg + insets.bottom }}>
          {THEMES.map((theme) => {
            const selected = currentTheme === theme.value;
            return (
              <TouchableOpacity
                key={theme.value}
                activeOpacity={0.7}
                onPress={() => handleSelect(theme.value)}
                className="flex-row items-center justify-between py-md px-sm"
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={{ color: colors.label }} className="text-body">
                  {t(theme.labelKey)}
                </Text>
                {selected && (
                  <Text style={{ color: colors.tint }} className="text-body">✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
          <Button className="mt-md" onPress={() => bottomSheetRef.current?.dismiss()}>{t('common.done')}</Button>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
