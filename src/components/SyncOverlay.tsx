import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SyncOverlayProps {
  message: string | null;
}

export function SyncOverlay({ message }: SyncOverlayProps) {
  return (
    <SafeAreaView
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
    >
      <ActivityIndicator size="large" />
      {message && (
        <Text style={{ color: '#888', marginTop: 8, textAlign: 'center' }}>
          {message}
        </Text>
      )}
    </SafeAreaView>
  );
}
