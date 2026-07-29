import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { tokens } from '../theme/tokens';

interface SyncOverlayProps {
  message: string | null;
}

export function SyncOverlay({ message }: SyncOverlayProps) {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = tokens.color[theme];

  return (
    <SafeAreaView
      className="flex-1 justify-center items-center p-xl bg-background dark:bg-background-dark"
    >
      <ActivityIndicator size="large" color={colors.tint} />
      {message && (
        <Text className="text-secondary-label dark:text-secondary-label-dark mt-sm text-center">
          {message}
        </Text>
      )}
    </SafeAreaView>
  );
}