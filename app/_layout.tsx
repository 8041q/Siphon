import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Host } from '@expo/ui';

import { AppProvider } from '../src/hooks/useApp';

export default function RootLayout() {
  return (
    <Host style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="price-trends/[id]"
            options={{ headerShown: true, title: 'Price History', presentation: 'modal' }}
          />
        </Stack>
      </AppProvider>
    </Host>
  );
}
