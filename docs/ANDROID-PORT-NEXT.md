# Android Port Notes

## BlurView

`expo-blur` on Android requires the `experimentalBlurMethod` prop set to `"dimezisBlurView"`:

```tsx
<BlurView
  experimentalBlurMethod="dimezisBlurView"
  intensity={80}
  style={{ overflow: 'hidden' }}
>
```

- The `tint` prop is **not supported** on Android. BlurView on Android always blurs the underlying content without a color tint overlay.
- On Android, the blur effect may be less performant than on iOS. Consider reducing `intensity` on lower-end devices.
- All BlurView usages in `app/(tabs)/index.tsx` (search pill, search feedback, filter button, locate button, offline banner, rate-limit banner) need this prop added for Android.

## Toggle / Switch

React Native's `Switch` component renders as a Material Design toggle on Android, which looks different from the iOS-style toggle.

- Current usage: `app/(tabs)/settings.tsx` line 233 uses `<Switch>` for the history toggle.
- For a consistent iOS-style toggle on Android, consider creating a custom `Toggle` component that renders a pill-shaped background with a sliding dot, matching the iOS aesthetic.

## Haptics

`expo-haptics` works on Android but with caveats:

- `Haptics.impactAsync()` supports `Light`, `Medium`, and `Heavy` styles on Android.
- `Haptics.selectionAsync()` requires Android API 28+ (Android 9.0). On older devices, it will silently do nothing.
- All current haptic calls (`selectionAsync` on sheets, `impactAsync` on toggles) are safe for Android.

## Bottom Sheet

`@gorhom/bottom-sheet` works on Android, but:

- Gesture handling may feel different (Android back button vs iOS swipe-down).
- The `enablePanDownToClose` prop works on Android.
- `enableContentPanningGesture={false}` is used to prevent content scrolling conflicts — this is the same on both platforms.

## Platform-Specific Layout

- Tab bar content height is already differentiated: `Platform.OS === 'ios' ? 52 : 70` in `app/(tabs)/_layout.tsx`.
- Other layout differences should be handled with `Platform.select()` or conditional styling as needed.

## Palette System

The theme palette system (`src/theme/palettes.ts`, `src/theme/variables.ts`) uses CSS custom properties for accent colors, which works on both iOS and Android via the native WebView-based rendering. No Android-specific changes needed for the palette system.
