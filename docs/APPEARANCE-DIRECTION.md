# Appearance direction — 2 October 2026

The investigation below led to the implemented appearance options: Round,
Minimal, and Glass, with independent Comfortable/Compact density and an optional
Lucide icon family. New installs default to Minimal, Compact, and Lucide.
Instrument was removed after visual review because it was too similar.
The original investigation below describes the starting point and proposals,
before the implementation and subsequent user refinements.

## Implemented behavior

- Round retains the original palette and fuel-badge composition.
- Minimal and Glass use neutral surfaces, a featured fuel price, and secondary
  prices. The selected/search-sorted fuel is featured when available; favorites
  use the first available fuel. All fuels remain visible.
- Glass applies blur to sheets and navigation overlays, with opaque content.
  Android surfaces without a safe blur target or below API 31 use a fully opaque
  fallback. Existing safe sheet/tab targets remain in place.
- Compact reduces spacing tokens, outer padding and chart height. Comfortable
  retains the original spacing values. Body type remains the same, prominent
  modern prices use 28 rather than 32 px, and common controls retain touch space.
- The bottom-sheet portal inherits appearance variables and the app blur target.
  Station details use the compact spacing and a smaller initial snap point.
  Compact filter chips restore the previous 28 px minimum height everywhere,
  including Market; Comfortable uses 44 px. Footer spacing follows density.
- The Favorites tab uses an outlined icon until selected, including Lucide.
- Styles, palettes, density and icons remain independent saved preferences.
  Existing Dotted/Retro/Instrument selections map to Minimal; Liquid Glass maps
  to Glass. Saved valid selections are preserved. Stable internal style IDs
  remain `default`, `quiet`, and `frosted`.
- Selected filter chips use solid accents and contrasting text across styles.
- Each picker section puts its default first; style previews are abstract 32 px
  symbols. Lucide tab icons fill only when selected.
- Custom SVG icon packs and location markers can be imported, validated, and
  saved. Both flows include a template and translated requirements; see
  [custom SVG artwork](CUSTOM-SVG.md).
- Location marker importing lives in a + tile beside Brake, with a separate
  popup for the template, requirements and file picker.
- Price values retain their anchored benchmark colors across all three styles.
  Round and Minimal map controls use opaque palette surfaces. Glass controls
  blur a separate map target with a 46% dark / 18% light extra veil and neutral
  text/icons, keeping contrast over bright and dark tiles. Expo's native material tint contributes
  another layer; the extra veil must not hide it. Older Android uses a 72%
  translucent tint fallback. Glass controls have a light reflective border. Legal headers and status-bar icons follow the app theme.
- The picker has translated descriptions and marks only the selected choice.
  Changes apply immediately while the sheet stays open. Its backdrop and icon
  parents remain stable across style and icon-family changes.

## Verification

TypeScript and all 149 automated tests pass, including palette/selection text
contrast, preference hydration, legacy style mapping, icon vocabulary, and
native appearance transitions/blur fallback, default preferences, sheet portal
scope, compact popup geometry, filter sizing, and selected tab icons.
Android and iOS Hermes bundles compile.

A temporary browser harness renders the changed React Native component source
through DOM/SVG adapters, using the actual Tailwind spacing, style rules,
palettes and Lucide geometry. The initial review checked station lists, price
history and the appearance picker. The refinement review checked station
details, the filter sheet and Market filters at 320 px with long German labels:
three styles × five palettes × two densities × light/dark × three screens,
180 cases without horizontal overflow.
The subsequent SVG review checked filters, Market, the appearance picker, icon
imports and marker imports across the same 320 px matrix: 300 cases without
horizontal overflow, including the longer German requirements and labels.
The latest review checked the marker grid, marker import popup, station list,
map control specimens, Legal page and appearance picker across 360 cases at
320 px, without horizontal overflow. The map specimens use the actual action
buttons and a representative search-area pill.
This validates composition and wrapping, not native font metrics or blur.

The live iOS appearance sheet and stored Play Store images informed the initial
investigation. A subsequent native review on the iOS 26.5 simulator verified
live Minimal/Glass and light/dark transitions, picker selection without dismissal,
and map translucency. Before/after captures on the same map show that reducing
the extra tint from 72% to 18% in light mode exposes the native material beneath
it; dark mode uses 46% to retain icon contrast. The appearance and theme sheets
now expose their option buttons individually to native accessibility instead of
grouping all content into one slider. No Android device was available. Physical
device blur, font scaling and scroll performance still require verification;
bundle export is not proof of those runtime behaviors.

## Main finding

The palettes have workable accent hues. Their application creates more of the
problem: background, grouped container, surface, text, separator, selection,
chart and marker colors all move together. Dark Sunset stacks brown on brown;
dark Forest stacks green on green. Price status then contributes green, amber
and red. The screen has several competing color systems before the user acts.

Default and Mono have a quieter foundation. Keep their useful qualities: strong
text, restrained emphasis, and familiar price signals. Neutral does not have to
mean flat or anonymous; depth, rhythm and typography can carry the personality.

## What the original implementation explained

- `src/theme/styles/types.ts` restricts styles to radius, border style/width,
  opacity and glass. It cannot express typography, spacing, elevation, grouped
  versus continuous rows, or emphasis. Retro and Dotted are therefore border
  treatments across the same composition. Retro is not a coherent retro system.
- `applyComponentRules` uses `colors.label` for decorative borders. Repeated
  dotted/dashed outlines can compete directly with foreground text.
- Android `GlassBackdrop` renders real blur only with a supplied target and API
  31 or newer. Otherwise it renders a 78% surface-color overlay. Station cards,
  ordinary cards, badges, chips, inputs and GlassBox do not provide a target.
  The tab bar and bottom-sheet backgrounds have target wiring. Map controls
  use GlassSurface without supplying a target. This explains much of the
  platform difference; it does not prove that the wired surfaces blur correctly
  on a real device, especially over the native map.
- Settings groups and several Market containers apply shape rules to opaque
  Views without rendering a glass backdrop. Style coverage is inconsistent.
- Even correctly wired blur over a uniform background looks close to a flat
  translucent fill. Blurring every nested badge does not create useful depth.
- One `tint` serves primary actions, selected chips, selected tabs and small
  links. Those roles need different emphasis, although they may share one hue.
- Price status already has dedicated tokens and anchored reference logic.
  Preserve that separation. Forest's action green is close to its low-price
  green; Sunset's orange selection can resemble mid-price amber. Explicit
  selection shapes and price labels should separate these meanings.
- The appearance sheet shows checkmarks for all available options while using
  weight/color to identify the active option. Availability and selection are
  visually conflated. A selected-only check and a real screen preview would
  communicate the choice more clearly than swatches and border samples.

## Recommended system

Treat appearance as three coordinated layers: light/dark mode; palette accents
on a mostly neutral foundation; and a surface/typography treatment. Avoid
offering combinations that cannot retain the same information hierarchy.

| Role | Proposed usage |
| --- | --- |
| Canvas | Neutral light or dark base, with only slight temperature from the palette |
| Content surface | Opaque, readable; one clear elevation step where useful |
| Quiet grouping | Spacing or a subtle neutral fill, rather than another colored box |
| Primary action | Solid accent with tested on-accent text |
| Selected control | Soft accent fill plus a mark, underline or contained shape |
| Secondary action | Neutral text/icon until interaction; accent when useful |
| Price comparison | Stable green/amber/red/unknown, paired with an explanation or label |
| Price trend | Arrow and amount; distinguish a fall from a low anchored-reference price |
| Chrome material | Frosted only where content passes behind it |
| Decorative texture | Subtle separators or one bounded region, using a quiet stroke |

Do not fix color congestion by desaturating every foreground. Keep important
signals recognizable. Reduce the area and frequency of decorative color first.
Likewise, keep price classification and calculations unchanged while testing
presentation. A neutral price plus a status label is one concept to evaluate,
not a requirement to remove the user's existing colored-price preference.

## Directions to compare

**Quiet** is the strongest foundation: neutral surfaces, less nesting, clear
selected fuel, and grouped price information. It should work with Default,
Mono and the other accent hues. The investigation preview deliberately tests
the same information with a stronger primary-price hierarchy; that layout is
a proposal, not a change already applied to the app.

**Frosted** keeps the Quiet content hierarchy and adds a floating material
dock and selective translucent chrome. Cards and charts stay opaque. A sheet
can blur the screen beneath it when a safe target is available. Android without
blur should have a complete solid-material treatment with an edge and subtle
elevation, rather than relying on transparency for its identity. Browser blur
in the preview demonstrates the intention, not native feasibility.

**Instrument** replaces Retro's dashed boxes with a functional visual language:
aligned numeric columns, restrained monospaced labels, continuous rows and
precise separators. It changes the reading rhythm and typography. It is a
distinct preference for dense comparisons, not the default for everybody.

The original proposal considered retaining Dotted as a texture over Quiet. The
accepted implementation replaces it with Quiet, keeping a saved-choice migration.

The accompanying comparison includes a source reconstruction and these three
concepts. Palette colors in the reconstruction come from the actual source.
Prices, stations and chart points in the concepts are illustrative. The same
palette hues remain available across concepts to isolate usage from hue choice.

## Original implementation proposal

1. Add semantic action/selection/surface tokens while retaining existing price
   tokens. Resolve the new roles centrally; avoid palette-specific conditions
   scattered through screens. Tune light and dark independently.
2. Implement Quiet on Search, station details/history, Market and Settings.
   Start with color roles and nesting within existing layouts; treat the larger
   hierarchy proposals as a separate decision. Preserve icon-only navigation,
   full fuel access, separate Home/Search filters, localization and text scaling.
3. Make style coverage explicit. Shared components should consume the same
   treatment, and raw screen containers should not partially apply it.
4. Build Frosted around safe overlay targets. Do not indiscriminately pass the
   root blur target into descendants: verify native view ancestry, render order,
   map capture, foreground integrity and scroll performance. Test API 31+ and
   an older Android fallback, plus iOS. Plain content needs no blur target.
5. Replace Retro only after comparing Instrument with real dense station lists.
   Keep a migration for saved style identifiers.
6. Replace swatch-only selection with a screen preview and selected-only mark.

Accept a direction when the important price and selection can be identified
quickly in every palette, status meanings remain distinct, text stays readable
on its actual surface, and a no-blur Android screen still looks intentional.
Review long station names, many fuels, empty/error states, text scaling and
both appearances. Measure native frame behavior on the frosted surfaces.

Android API requirements were checked against the installed Expo Blur source
and [Expo's SDK 57 BlurView documentation](https://docs.expo.dev/versions/latest/sdk/blur-view/).
