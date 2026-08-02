import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeTokens } from '../hooks/useThemeTokens';

interface SyncOverlayProps {
  message: string | null;
}

export function SyncOverlay({ message }: SyncOverlayProps) {
  const { colors } = useThemeTokens();

  return (
    <SafeAreaView
      className="flex-1 justify-center items-center p-xl"
      style={{ backgroundColor: colors.background }}
    >
      <ActivityIndicator size="large" color={colors.tint} />
      {message && (
        <Text style={{ color: colors.secondaryLabel }} className="mt-sm text-center">
          {message}
        </Text>
      )}
    </SafeAreaView>
  );
}