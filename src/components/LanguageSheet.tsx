import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

interface LanguageOption {
  code: string;
  labelKey: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', labelKey: 'settings.english' },
  { code: 'pt', labelKey: 'settings.portuguese' },
  { code: 'es', labelKey: 'settings.spanish' },
  { code: 'fr', labelKey: 'settings.french' },
  { code: 'de', labelKey: 'settings.german' },
];

interface LanguageSheetProps {
  currentLang: string;
  onSelectLanguage: (code: string) => void;
  onDismiss: () => void;
}

export type LanguageSheetHandle = { present: () => void };

export const LanguageSheet = forwardRef<LanguageSheetHandle, LanguageSheetProps>(
  function LanguageSheet({ currentLang, onSelectLanguage, onDismiss }, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['40%'], []);

    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
    }));

    const handleSelect = useCallback((code: string) => {
      Haptics.selectionAsync();
      onSelectLanguage(code);
      bottomSheetRef.current?.dismiss();
    }, [onSelectLanguage]);

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
        onDismiss={onDismiss}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          {LANGUAGES.map((lang) => {
            const selected = currentLang === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                activeOpacity={0.7}
                onPress={() => handleSelect(lang.code)}
                className="flex-row items-center justify-between py-md px-sm"
              >
                <Text className="text-body text-label dark:text-label-dark">
                  {t(lang.labelKey)}
                </Text>
                {selected && (
                  <Text className="text-tint dark:text-tint-dark text-body">✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
