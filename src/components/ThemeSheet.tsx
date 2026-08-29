import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';
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
    const snapPoints = useMemo(() => ['30%'], []);
    const pendingTheme = useRef<ThemePref | null>(null);

    const { colors } = useThemeTokens();

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
    }));

    const handleSelect = useCallback((pref: ThemePref) => {
      Haptics.selectionAsync();
      pendingTheme.current = pref;
      bottomSheetRef.current?.dismiss();
    }, []);

    const handleDismiss = useCallback(() => {
      if (pendingTheme.current) {
        onSelectTheme(pendingTheme.current);
        pendingTheme.current = null;
      }
      onDismiss();
    }, [onSelectTheme, onDismiss]);

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
        onDismiss={handleDismiss}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundComponent={SheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
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
