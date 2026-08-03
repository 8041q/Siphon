import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

import { useThemeTokens } from '../../hooks/useThemeTokens';

/**
 * Absolute-fill glassmorphism backdrop to place as the FIRST child of any surface
 * whenever the active style set marks that component as `glass`.
 *
 * Renders a BlurView plus a translucent palette-tinted overlay *behind* the
 * surface's other children, so text/content stays sharp (no whole-view opacity).
 *
 * The parent surface is responsible for clipping (`overflow: 'hidden'`, which
 * `applyComponentRules` applies automatically for glass rules) and for its own
 * padding/spacing.
 */
export function GlassBackdrop({ color }: { color?: string }) {
  const { scheme, colors } = useThemeTokens();

  const tint =
    scheme === 'dark' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <BlurView
        style={StyleSheet.absoluteFill}
        tint={tint}
        intensity={70}
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: color ?? colors.surface, opacity: 0.35 }]}
      />
    </View>
  );
}