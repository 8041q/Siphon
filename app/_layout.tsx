import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Appearance, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { colorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBackgroundColorAsync } from 'expo-system-ui';

import { StationDetailSheet } from '../src/components/StationDetailSheet';
import { AppProvider } from '../src/hooks/useApp';
import { SupportProvider, useSupport } from '../src/hooks/useSupport';
import { useAdConsent } from '../src/hooks/useAdConsent';
import { useAppUpdate } from '../src/hooks/useAppUpdate';
import { getPalette } from '../src/theme/palettes';
import '../src/i18n';

function ThemeInit() {
  useEffect(() => {
    AsyncStorage.getItem('siphon:theme').then(async (val) => {
      if (val === 'light' || val === 'dark') {
        colorScheme.set(val);
        const paletteVal = await AsyncStorage.getItem('siphon:palette');
        const palette = getPalette(paletteVal ?? 'default');
        setBackgroundColorAsync(palette[val].background);
      }
    });
  }, []);
  return null;
}

// Verifies on launch whether a new version is available (no download).
function UpdateWatcher() {
  useAppUpdate();
  return null;
}

// Gathers EU (GDPR) consent and requests iOS tracking permission on launch - now deferred to rewards page
const ConsentInit = () => null;

function AppContent() {
  const { paletteVariables } = useSupport();
  return (
    <View className="flex-1" style={paletteVariables}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="price-trends/[id]"
          options={{ headerShown: true, presentation: 'modal' }}
        />
      </Stack>
      <StationDetailSheet />
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
              <ThemeInit />
              <UpdateWatcher />
              <ConsentInit />
              <AppContent />
            </BottomSheetModalProvider>
          </SupportProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
