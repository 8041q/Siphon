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

/** Expo's material already includes a tint; keep the extra map veil light. */
export function mapGlassTintOpacity(scheme: 'light' | 'dark', blurTarget?: BlurTargetRef): number {
  const hasNativeBlur = Platform.OS !== 'android' || (Number(Platform.Version) >= 31 && blurTarget != null);
  return hasNativeBlur ? (scheme === 'dark' ? 0.46 : 0.18) : 0.72;
}

export function mapGlassBorderColor(scheme: 'light' | 'dark'): string {
  return scheme === 'dark' ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.72)';
}

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
  borderRadius,
  enabled = true,
  tintOpacity,
}: {
  color?: string;
  blurTarget?: BlurTargetRef | null;
  borderRadius?: ViewStyle['borderRadius'];
  enabled?: boolean;
  /** Optional veil strength for contrast-protected translucent controls. */
  tintOpacity?: number;
}) {
  const { scheme, colors } = useThemeTokens();
  const tint =
    scheme === 'dark' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';

  const android = Platform.OS === 'android';
  const androidApi = android ? Number(Platform.Version) : Number.POSITIVE_INFINITY;
  const canBlurAndroid = android && blurTarget != null && androidApi >= 31;
  const shouldRenderBlur = !android || canBlurAndroid;
  const overlayOpacity = tintOpacity ?? (android && !canBlurAndroid ? 1 : 0.35);

  return (
    <View
      style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden', zIndex: -1, opacity: enabled ? 1 : 0 }]}
      pointerEvents="none"
    >
      {shouldRenderBlur && (
        <BlurView
          style={StyleSheet.absoluteFill}
          tint={tint}
          intensity={enabled ? 70 : 0}
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
 * A glass/tint surface. Android clips only the backdrop so rounded clipping
 * cannot hide the foreground content. Without an Android BlurTargetView it uses
 * the performant tint fallback instead of invoking the legacy Android blur path.
 */
export function GlassSurface({
  children,
  color,
  style,
  blurTarget,
  opaque = false,
  tintOpacity,
  ...viewProps
}: PropsWithChildren<
  ViewProps & {
    color?: string;
    blurTarget?: BlurTargetRef | null;
    opaque?: boolean;
    tintOpacity?: number;
    style?: StyleProp<ViewStyle>;
  }
>) {
  const { colors } = useThemeTokens();
  return (
    <View
      {...viewProps}
      style={[
        { overflow: 'hidden' },
        style,
        opaque && { backgroundColor: color ?? colors.surface },
        { isolation: 'isolate' },
        Platform.OS === 'android' && { overflow: 'visible' },
      ]}
    >
      {!opaque && <GlassBackdrop color={color} blurTarget={blurTarget} tintOpacity={tintOpacity} borderRadius={StyleSheet.flatten(style)?.borderRadius} />}
      {children}
    </View>
  );
}
