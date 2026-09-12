import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { useBottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import { SHEET_HANDLE_STYLE, SHEET_HANDLE_INDICATOR_STYLE } from '../theme/layout';
import { SheetBackground } from './ui/SheetBackground';

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
    const snapPoints = useMemo(() => ['30%'], []);
    const pendingTheme = useRef<ThemePref | null>(null);

    const { colors } = useThemeTokens();
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
    }));

    const handleSelect = useCallback((pref: ThemePref) => {
      void Haptics.selectionAsync().catch(() => undefined);
      pendingTheme.current = pref;
      bottomSheetRef.current?.dismiss();
    }, []);

    const handleDismiss = useCallback(() => {
      handleSheetDismiss();
      if (pendingTheme.current) {
        onSelectTheme(pendingTheme.current);
        pendingTheme.current = null;
      }
      onDismiss();
    }, [handleSheetDismiss, onSelectTheme, onDismiss]);

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
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
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundComponent={SheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
          {THEMES.map((theme) => {
            const selected = currentTheme === theme.value;
            return (
              <TouchableOpacity
                key={theme.value}
                activeOpacity={0.7}
                onPress={() => handleSelect(theme.value)}
                className="flex-row items-center justify-between py-md px-sm"
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
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
