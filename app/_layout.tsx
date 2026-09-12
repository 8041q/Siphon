import '../global.css';

import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { BlurTargetView } from 'expo-blur';
import { colorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBackgroundColorAsync } from 'expo-system-ui';

import { StationDetailSheet } from '../src/components/StationDetailSheet';
import { AppProvider } from '../src/hooks/useApp';
import { SupportProvider, useAppearanceSupport } from '../src/hooks/useSupport';
import { useAppUpdate } from '../src/hooks/useAppUpdate';
import { useThemeTokens } from '../src/hooks/useThemeTokens';
import { AppBlurTargetProvider } from '../src/components/ui/glass';
import i18n from '../src/i18n';

const LANGUAGE_KEY = 'siphon:language';
const THEME_KEY = 'siphon:theme';
const SUPPORTED_LANGUAGES = new Set(['en', 'pt', 'es', 'fr', 'de']);

function PreferencesInit() {
  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      AsyncStorage.getItem(THEME_KEY).catch(() => null),
      AsyncStorage.getItem(LANGUAGE_KEY).catch(() => null),
    ]).then(async ([theme, language]) => {
      if (cancelled) return;

      if (theme === 'light' || theme === 'dark' || theme === 'system') {
        colorScheme.set(theme);
      }

      if (language && SUPPORTED_LANGUAGES.has(language) && i18n.language !== language) {
        try {
          await i18n.changeLanguage(language);
        } catch {
          // Device-language fallback remains active.
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

function SystemBackgroundSync() {
  const { colors } = useThemeTokens();

  useEffect(() => {
    void setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  return null;
}

function UpdateWatcher() {
  useAppUpdate();
  return null;
}

function AppContent() {
  const { paletteVariables } = useAppearanceSupport();
  const blurTargetRef = useRef<View | null>(null);

  return (
    <View className="flex-1" style={paletteVariables}>
      <StatusBar style="auto" />
      <AppBlurTargetProvider target={blurTargetRef}>
        <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="price-trends/[id]"
              options={{ headerShown: true, presentation: 'modal' }}
            />
          </Stack>
        </BlurTargetView>
        <StationDetailSheet />
      </AppBlurTargetProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <SupportProvider>
            <BottomSheetModalProvider>
              <PreferencesInit />
              <SystemBackgroundSync />
              <UpdateWatcher />
              <AppContent />
            </BottomSheetModalProvider>
          </SupportProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
