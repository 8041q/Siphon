import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Host } from '@expo/ui';

import { StationDetailSheet } from '../src/components/StationDetailSheet';
import { AppProvider } from '../src/hooks/useApp';

export default function RootLayout() {
  return (
    <Host style={{ flex: 1 }}>
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
    </Host>
  );
}
