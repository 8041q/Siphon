import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSupport } from '../../hooks/useSupport';
import { useStyleConfig, isGlass } from '../../hooks/useStyleConfig';

type SheetBackgroundProps = {
  pointerEvents?: any;
};

// See note in GlassBackdrop: `blurReductionFactor` default 4 silences the blur
// on Android; `dimezisBlurView` fallback keeps blur on Android < 12.
function androidBlurMethod() {
  if (Platform.OS !== 'android') return undefined;
  return (Platform.Version as number) >= 31 ? 'dimezisBlurViewSdk31Plus' : 'dimezisBlurView';
}

/**
 * Reusable background for @gorhom/bottom-sheet `backgroundComponent`.
 *
 * - Non-glass style sets (default / dotted / retro): renders the solid sheet
 *   background exactly as the default did (15px top radius), so nothing breaks.
 * - Liquid-glass style set: renders a blur + translucent tint behind the same
 *   content, clipped to the same 15px radius.
 */
export function SheetBackground({ pointerEvents }: SheetBackgroundProps) {
  const { scheme, colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'sheet');
  const glass = isGlass(rules);

  const base: any[] = [
    StyleSheet.absoluteFill,
    { borderRadius: 15 },
    glass
      ? { backgroundColor: 'transparent', overflow: 'hidden' }
      : { backgroundColor: colors.sheet },
  ];

  if (!glass) {
    return (
      <View
        pointerEvents={pointerEvents}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Bottom Sheet"
        style={base}
      />
    );
  }

  const tint =
    scheme === 'dark' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';

  return (
    <View
      pointerEvents={pointerEvents ?? 'box-none'}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Bottom Sheet"
      style={base}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        tint={tint}
        intensity={70}
        blurReductionFactor={1}
        blurMethod={androidBlurMethod()}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.sheet, opacity: 0.35 }]}
      />
    </View>
  );
}