# UI Guidelines — Fuel Price App
Follow this document as the source of truth for the UI theme. If a design question isn't answered here, default to Apple's Human Interface Guidelines and mirror the token values below rather than inventing new ones.

---

## 1. Core philosophy

1. **The app should look and feel like an iOS app on both platforms.** Type, spacing, iconography, and motion are driven by one shared token set (section 3), not by "whatever Material gives you for free."
2. **Respect Android where the control's *behavior* matters, not its skin.** A `Switch` still needs to toggle the way Android users expect. But its color, corner radius, and the text around it come from *our* tokens, not Material's defaults. Don't fight ripple effects, back-gesture, or the system nav bar — those are behavioral, not stylistic.
3. **Universal first, platform-specific second, custom last.** Every component decision goes through the order in section 2 before you write a single `Platform.OS` check.
4. **One shared brand accent, everything else follows Apple's semantics.** See the color tokens — don't invent new system colors when Apple already has one that does the job (labels, separators, backgrounds).

---

## 2. Component selection order (the golden rule)

For every piece of UI, work down this list and **stop at the first layer that covers the need**:

1. **Universal** (`@expo/ui` root import) — one component tree, runs on iOS + Android (+ web). Start here always.
2. **Drop-in replacements** (`@expo/ui/community/*`) — cross-platform, API-compatible swaps for common RN community libraries (bottom sheets, date pickers, pickers, segmented control, sliders, pager view, menu). Use these instead of pulling in the original third-party library.
3. **Platform-specific** (`@expo/ui/swift-ui` on iOS, `@expo/ui/jetpack-compose` on Android) — only when neither of the above has the component or behavior you need. This means two trees, split into `.ios.tsx` / `.android.tsx` files.
4. **Custom RN component** — last resort, for pure layout containers or truly novel widgets neither platform's kit provides.

---

## 3. Design tokens ("the theme")

### 3.1 Color

Two-tier system: Apple's semantic system colors for chrome (so light/dark mode and accessibility contrast are correct for free), plus a small brand layer for anything price- or brand-related.

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FFFFFF` | `#000000` | Screen background |
| `groupedBackground` | `#F2F2F7` | `#000000` | Settings/list screen background (iOS "grouped" look) |
| `surface` | `#FFFFFF` | `#1C1C1E` | Cards, sheets, grouped rows |
| `label` | `#000000` | `#FFFFFF` | Primary text |
| `secondaryLabel` | `#3C3C4399` (60%) | `#EBEBF599` (60%) | Subtitles, metadata |
| `tertiaryLabel` | `#3C3C434D` (30%) | `#EBEBF54D` (30%) | Placeholder text, disabled |
| `separator` | `#3C3C4336` | `#54545899` | Hairlines |
| **`tint` (brand)** | `#0C8599` | `#22B8CD` | "Petrol teal" — buttons, active tab, selected states, map "locate me" button |
| `priceLow` | `#22A559` | `#30D158` | Cheapest price in a list/marker |
| `priceMid` | `#F2A93B` | `#FFD60A` | Mid-range price |
| `priceHigh` | `#E5484D` | `#FF453A` | Most expensive price |
| `destructive` | `#FF3B30` | `#FF453A` | Delete favorite, remove filters |

Notes:
- `tint` is deliberately **not** iOS system blue (`#007AFF`) — that keeps the app from reading as a generic default while everything else still follows Apple's conventions. Swap the hex if you want a different brand color, but keep it out of the green/amber/red band reserved for price semantics.
- Wire light/dark switching through each platform's native appearance API (`AppleMapsColorScheme` on the map, `useColorScheme()` elsewhere) — don't roll your own dark-mode detection.

### 3.2 Typography

Mirror iOS's Dynamic Type scale exactly. On iOS this maps straight to `font()` modifiers; on Android/Jetpack, hardcode the same point sizes and weights so both platforms visually match even though Android has no equivalent Dynamic Type concept.

| Token | Size / Weight | Use |
|---|---|---|
| `largeTitle` | 34 / bold | Screen title on scroll-to-top (nav bar large title) |
| `title1` | 28 / bold | Section-level headers |
| `title2` | 22 / bold | Sheet titles |
| `title3` | 20 / semibold | Card titles |
| `headline` | 17 / semibold | List row primary text, button labels |
| `body` | 17 / regular | Default body copy |
| `callout` | 16 / regular | Secondary descriptive text |
| `subheadline` | 15 / regular | List row secondary line (address, distance) |
| `footnote` | 13 / regular | Timestamps ("Updated 12 min ago") |
| `caption1` | 12 / regular | Map marker labels, badges |
| `caption2` | 11 / regular | Legal/fine print |

```tsx
// iOS (swift-ui)
import { Text } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';

<Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(tokens.color.label)]}>
  Repsol — Av. da Liberdade
</Text>
```

Pick one typeface family for the whole app (system font is the safe default and reinforces "this is a native iOS app" — don't reach for a display font unless you want a specific brand voice). If you do add a custom font, load it once with `expo-font` and reference it through the `family` param of the `font()` modifier / the Jetpack `TextField`/`Text` font family prop — never inline a font name in a screen.

### 3.3 Spacing & radius

4pt grid, matching Apple's own spacing conventions:

`space.xs = 4, space.sm = 8, space.md = 12, space.lg = 16, space.xl = 20, space.xxl = 24, space.xxxl = 32`

Screen margins: **16pt** left/right (Apple's standard). List row vertical padding: **12pt**.

Corner radius: `radius.sm = 8` (small controls, chips), `radius.md = 12` (buttons, list rows), `radius.lg = 16` (cards), `radius.xl = 24` (sheet tops, prominent cards).

### 3.4 Materials, elevation, and the current iOS look

- Tab bar / nav bar background: use a translucent **blur material**, not a flat fill. `expo-blur`'s `BlurView`, or the native tab bar's own `blurEffect` prop (`systemUltraThinMaterial`, `systemThinMaterial`, etc.) covers this natively on iOS.
- Floating controls (the "locate me" button, a floating filter chip) get a **capsule shape** (`radius = height / 2`) on a blurred/translucent surface, matching how Apple Maps and Photos style their floating buttons.
- Avoid Material's box-shadow-heavy elevation on Android for the same components — use a thin `separator`-colored border or a very subtle shadow (`elevation 1–2` at most) instead of Material's default card elevation, so cards don't look like they came from a different app.

### 3.5 Iconography

**SF Symbols on iOS, Material Symbols on Android — same semantic icon, different rendering, driven by one call site.** Use the Universal `Icon` component (`sf` + `md` props in one call) wherever you're just placing an icon in a Universal tree; use the `sf` / `md` pair on `NativeTabs.Trigger.Icon` for tab bar icons.

| Purpose | SF Symbol (iOS) | Material Symbol (Android) |
|---|---|---|
| Map tab | `map.fill` | `map` |
| Stations/list tab | `list.bullet` | `list` |
| Favorites tab | `star.fill` | `star` |
| Settings tab | `gearshape.fill` | `settings` |
| Fuel station marker | `fuelpump.fill` | `local_gas_station` |
| Locate me | `location.fill` | `my_location` |
| Filter | `line.3.horizontal.decrease.circle` | `filter_list` |
| Search | `magnifyingglass` | `search` |
| Directions | `arrow.triangle.turn.up.right.circle` | `directions` |
| Favorite (unfilled/filled) | `star` / `star.fill` | `star_border` / `star` |

Verify every SF Symbol name you use actually exists in the current SF Symbols app before shipping — the catalog changes across iOS versions. Use `expo-symbols` for any SF Symbol reference outside of an `@expo/ui` Host tree (e.g. inside a plain React Native view).

### 3.6 Motion & haptics

- Navigation push/pop, sheet presentation, and tab switches: use the platform defaults (don't override native transition curves — this is one place "native" beats "custom" outright).
- Add `expo-haptics` light-impact feedback on: selecting a map marker, toggling a favorite, pull-to-refresh completion. This is a cheap, high-value "feels like a real iOS app" signal that's easy to forget.

**Note**: Import `useColorScheme` from 'react-native' for color scheme detection, not from expo-system-ui (which is for status bar/background styling only).

---

## 4. Navigation architecture

### 4.1 Root: native tabs

Use `expo-router/unstable-native-tabs` for the root navigator — it renders a real `UITabBar` on iOS and a real Material 3 bottom nav on Android from one component tree, with the icon table above driving both.

```tsx
// app/(tabs)/_layout.tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { tokens } from '@/theme/tokens';

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={tokens.color.tint}
      blurEffect="systemUltraThinMaterial"   // iOS only — ignored on Android
    >
      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Icon sf="map.fill" md="map" />
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stations">
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
        <NativeTabs.Trigger.Label>Stations</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites">
        <NativeTabs.Trigger.Icon sf="star.fill" md="star" />
        <NativeTabs.Trigger.Label>Favorites</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

On Android this still renders as a genuine Material bottom nav (you can't turn it into a literal iOS tab bar) — but `tintColor`, a muted/disabled `rippleColor`, and `disableIndicator` get it close enough that it reads as "the same app" rather than a jarring context switch.

### 4.2 Stack headers (within each tab)

Use Expo Router's `Stack` with `headerLargeTitle: true` for the Stations and Favorites tabs (list → detail pattern). Keep headers translucent/blurred to match the tab bar rather than a flat Material app-bar fill on Android.

### 4.3 Sheets & modals

Use the Universal `BottomSheet` (`@expo/ui` root import) for anything that should slide up from the bottom — this renders a true `UISheetPresentationController` on iOS (with real drag handle and detents) and a true Material `ModalBottomSheet` on Android from one call site. This is your station-detail card when a map marker is tapped — the same interaction pattern as Apple Maps' place card.

---

## 5. Component playbook — what falls back to what

This is the table the user asked for: SwiftUI-only components you'll reach for, and what to do about them on Android.

| You want (SwiftUI-only) | Android path | Notes |
|---|---|---|
| `Form` + `Section` (grouped settings rows) | **Prefer Universal `FieldGroup`** — cross-platform, built for exactly this | Only drop to swift-ui `Form`/`Section` directly if you need iOS-only fidelity `FieldGroup` doesn't expose yet. Check the current `FieldGroup` API before relying on it for anything non-trivial — it's a newer component. |
| `DisclosureGroup` (expandable section) | **Universal `Collapsible`** | Cross-platform, no fallback needed. |
| `Menu` (dropdown button) | **Drop-in `Menu`** (`@expo/ui/community/menu`) | Cross-platform, no fallback needed. |
| `TabView` (in-page swipeable pages, e.g. an onboarding carousel — not the root tab bar) | **Drop-in `PagerView`** | Cross-platform, no fallback needed. |
| `ZStack` (overlapping layout) | Jetpack `Box` | 1:1 conceptual match — stacking children. |
| `HStack` / `VStack` | Universal `Row` / `Column` | Prefer these over the swift-ui-only versions whenever the tree is otherwise cross-platform. |
| `ContextMenu` (long-press menu) | Jetpack `DropdownMenu` triggered on long-press | No 1:1 universal component; write a small platform-specific wrapper once and reuse it. |
| `SwipeActions` (swipe-to-reveal row actions) | **No equivalent gesture primitive in this kit.** Recommended: don't force the gesture on Android — show a persistent trailing icon button (e.g. a "…" or star icon) on the Android row that performs the same action. | This is a deliberate UX adaptation, not a compromise: Android users don't expect hidden swipe actions on every list the way iOS users do. If you want gesture parity anyway, wrap the Jetpack row in `react-native-gesture-handler`'s `Swipeable`. |
| `ControlGroup` (segmented button cluster) | Jetpack `SegmentedButton` | Close conceptual match. |
| `ConfirmationDialog` / `Alert` | For simple "Are you sure?" prompts, just use React Native's built-in `Alert.alert()` — it's cross-platform already and avoids this split entirely. Reserve the swift-ui `ConfirmationDialog` (real iOS action sheet) for cases where you specifically want that presentation style, with Jetpack `AlertDialog`/`ModalBottomSheet` as the Android counterpart. | |
| `Popover` | Jetpack `Tooltip`, or a small custom anchored overlay | No 1:1 match; keep these rare. |
| `DatePicker` | **Drop-in `DateTimePicker`** | Cross-platform, no fallback needed — useful later for a "notify me when price drops" scheduling feature. |
| `Divider` | Jetpack `Divider` | 1:1 pairing — or just use a plain `View` styled as a hairline; it's a single-pixel line, not worth a platform split. |
| `Label` (icon + text) | Compose it yourself from Universal `Row` + `Icon` + `Text` | Simpler than maintaining a platform split for something this small. |
| `Gauge`, `AccessoryWidgetBackground` | Not needed — these are iOS widget/Live Activity concepts with no Android analog to fall back to. Skip entirely unless you build an iOS widget later. | |

General rule when a table row doesn't cover something new you need: check `docs.expo.dev/versions/latest/sdk/ui` first (new components ship often), then fall back to the mapping logic above (behavioral match > visual match).

---

## 6. Screen specs

### 6.1 Map (startup screen)

- `expo-maps`: `AppleMaps.View` on iOS, `OpenFreeMaps` on Android.
- Markers: one per station, using the `priceLow` / `priceMid` / `priceHigh` tokens as marker tint based on that station's price relative to the visible region's average. SF Symbol `fuelpump.fill` as the marker glyph on iOS (`systemImage`); closest Android marker icon equivalent using the same token colors.
- Floating "locate me" button: capsule shape, blurred/translucent background, `tint` color icon — bottom-right, matching Apple Maps' placement.
- Tapping a marker opens the station detail **BottomSheet** (section 4.3) rather than navigating to a new screen — keeps the map visible underneath, matching Apple Maps / Waze convention.
- Search: a rounded search field pinned to the top (native `TextInput`-style field, iOS-rounded), rather than a separate search tab.

### 6.2 Station detail sheet

Built from Universal `FieldGroup` rows (or hand-rolled `Row`/`Column` + `Text` if `FieldGroup` doesn't yet support what you need): station name & brand, address, distance, one row per fuel type showing price + "updated X ago" (`footnote` token), a favorite toggle (star icon button), and a primary "Get Directions" button (`tint` color, `radius.md`).

### 6.3 Stations list

Universal `List` + `ListItem`, inset-grouped look (`groupedBackground` behind, `surface` cards). Each row: station name (`headline`), address (`subheadline`), price badge colored by `priceLow`/`priceMid`/`priceHigh`. Swipe-to-favorite on iOS via `SwipeActions`; trailing star icon button on Android per the mapping table above.

### 6.4 Favorites

Same row style as Stations, just a filtered data source. Empty state: a centered SF Symbol/Material Symbol (`star`), `body` text, no gimmicks.

### 6.5 Settings

Built entirely from Universal `FieldGroup` — units (L vs gal), default fuel type, distance unit, about/version, links. This screen should need **zero** platform-specific code if `FieldGroup` covers your needs, since it was built for exactly this.

---

## 7. Do's and don'ts

**Do**
- Start every new screen by checking the Universal layer before writing platform-specific code.
- Keep every `Platform.OS` branch confined to one small wrapper component, not scattered through screens.
- Use the same icon *meaning* on both platforms even when the glyph differs (table in 3.5).
- Add haptics on the small interactions (favorite toggle, marker select) — cheap and high-impact.

**Don't**
- Don't hardcode colors/fonts/spacing in a screen — route everything through `theme/tokens.ts`.
- Don't try to force Android's `Switch`, ripple, or back-gesture to look/behave like iOS — reskin color and type only, keep the native interaction model.
- Don't mix `@expo/ui/swift-ui` and `@expo/ui/jetpack-compose` imports in one file that runs on both platforms — it crashes at runtime.
- Don't put a `.ios.tsx`/`.android.tsx` file inside `app/` — Expo Router won't resolve the platform extension there.

---

## 8. Definition of done (per screen)

- [ ] Every color/spacing/type value traces back to `theme/tokens.ts`.
- [ ] Works in both light and dark mode.
- [ ] Icons use the sf/md pairing from section 3.5, not a one-off icon library.
- [ ] No unnecessary `.ios.tsx`/`.android.tsx` split — only where the component playbook (section 5) says it's required.
- [ ] Tested on a development build, not just Expo Go (map + native tabs won't run in Expo Go).
