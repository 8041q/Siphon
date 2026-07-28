import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../theme/tokens';

interface SyncOverlayProps {
  message: string | null;
}

export function SyncOverlay({ message }: SyncOverlayProps) {
  const colors = tokens.color.light;
  return (
    <SafeAreaView
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
    >
      <ActivityIndicator size="large" />
      {message && (
        <Text style={{ color: colors.secondaryLabel, marginTop: 8, textAlign: 'center' }}>
          {message}
        </Text>
      )}
    </SafeAreaView>
  );
}
