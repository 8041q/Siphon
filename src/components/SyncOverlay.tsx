import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeTokens } from '../hooks/useThemeTokens';

interface SyncOverlayProps {
  message: string | null;
}

export function SyncOverlay({ message }: SyncOverlayProps) {
  const { colors, scheme } = useThemeTokens();
  const artwork = scheme === 'dark'
    ? require('../../assets/splash-screen-dark.png')
    : require('../../assets/splash-screen.png');

  return (
    <ImageBackground
      source={artwork}
      resizeMode="contain"
      style={{ flex: 1, backgroundColor: scheme === 'dark' ? '#121212' : '#faf8f1' }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.progress} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={colors.tint} />
          {message && (
            <Text
              style={{ color: scheme === 'dark' ? '#f5f1e7' : '#262626' }}
              className="mt-sm text-center"
            >
              {message}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  progress: {
    position: 'absolute',
    top: '58%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
});
