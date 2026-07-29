import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { StationDetailSheet } from '../src/components/StationDetailSheet';
import { AppProvider } from '../src/hooks/useApp';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <View className={`flex-1 ${colorScheme === 'dark' ? 'dark' : ''}`}>
          <StatusBar style="auto" />
          <AppProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="price-trends/[id]"
                options={{ headerShown: true, title: 'Price History', presentation: 'modal' }}
              />
            </Stack>
            <StationDetailSheet />
          </AppProvider>
        </View>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
