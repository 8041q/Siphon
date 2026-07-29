import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { colorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBackgroundColorAsync } from 'expo-system-ui';

import { StationDetailSheet } from '../src/components/StationDetailSheet';
import { AppProvider } from '../src/hooks/useApp';

function ThemeInit() {
  useEffect(() => {
    AsyncStorage.getItem('siphon:theme').then((val) => {
      if (val === 'light' || val === 'dark') {
        colorScheme.set(val);
        
        setBackgroundColorAsync(val === 'dark' ? '#1C1C1E' : '#FFFFFF');
      }
    });
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <AppProvider>
            <ThemeInit />
            <View className="flex-1">
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="price-trends/[id]"
                  options={{ headerShown: true, title: 'Price History', presentation: 'modal' }}
                />
              </Stack>
              <StationDetailSheet />
            </View>
          </AppProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}