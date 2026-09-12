import {
  createContext,
  useContext,
  type PropsWithChildren,
  type RefObject,
} from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

import { useThemeTokens } from '../../hooks/useThemeTokens';

export type BlurTargetRef = RefObject<View | null>;

const AppBlurTargetContext = createContext<BlurTargetRef | null>(null);

export function AppBlurTargetProvider({
  target,
  children,
}: PropsWithChildren<{ target: BlurTargetRef }>) {
  return (
    <AppBlurTargetContext.Provider value={target}>
      {children}
    </AppBlurTargetContext.Provider>
  );
}

/**
 * Root app content target used by modal/sheet glass. React context is preserved
 * through portals, so bottom-sheet backgrounds can blur the screen behind them.
 */
export function useAppBlurTarget(): BlurTargetRef | null {
  return useContext(AppBlurTargetContext);
}

/**
 * Absolute-fill glass backdrop. On Android 12+ a real blur is used only when a
 * BlurTargetView ref is supplied. On older Android versions (or surfaces that
 * cannot safely target another view) it intentionally falls back to tint-only
 * glass rather than the much more expensive legacy RenderScript blur.
 */
export function GlassBackdrop({
  color,
  blurTarget,
}: {
  color?: string;
  blurTarget?: BlurTargetRef | null;
}) {
  const { scheme, colors } = useThemeTokens();
  const tint =
    scheme === 'dark' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';

  const android = Platform.OS === 'android';
  const androidApi = android ? Number(Platform.Version) : Number.POSITIVE_INFINITY;
  const canBlurAndroid = android && blurTarget != null && androidApi >= 31;
  const shouldRenderBlur = !android || canBlurAndroid;
  const overlayOpacity = android && !canBlurAndroid ? 0.78 : 0.35;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {shouldRenderBlur && (
        <BlurView
          style={StyleSheet.absoluteFill}
          tint={tint}
          intensity={70}
          blurReductionFactor={1}
          blurTarget={android ? blurTarget ?? undefined : undefined}
          blurMethod={android ? 'dimezisBlurViewSdk31Plus' : undefined}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: color ?? colors.surface, opacity: overlayOpacity },
        ]}
      />
    </View>
  );
}

/**
 * A clipped glass/tint surface. Without an Android BlurTargetView it deliberately
 * uses the performant tint fallback from GlassBackdrop instead of invoking the
 * legacy Android blur path.
 */
export function GlassSurface({
  children,
  color,
  style,
  blurTarget,
  ...viewProps
}: PropsWithChildren<
  ViewProps & {
    color?: string;
    blurTarget?: BlurTargetRef | null;
    style?: StyleProp<ViewStyle>;
  }
>) {
  return (
    <View {...viewProps} style={[{ overflow: 'hidden' }, style]}>
      <GlassBackdrop color={color} blurTarget={blurTarget} />
      {children}
    </View>
  );
}
