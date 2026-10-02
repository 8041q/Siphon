# Custom SVG artwork

Open **Settings → Appearance → Custom SVG** to import an icon pack. Save the
provided template through the native share sheet, edit it, then import the `.svg`
file. The imported pack stays on the device and can be selected again without
reimporting it. Selecting another icon family keeps the imported pack available.

[Icon pack template](../assets/templates/siphon-icons.svg) ·
[Location marker template](../assets/templates/siphon-marker.svg)

## Icon packs

An icon pack is a single SVG sprite containing named `<symbol>` elements inside
`<defs>`. Keep the template's IDs. Every symbol needs a valid `viewBox`, either
its own or inherited from the root SVG. The template uses `0 0 24 24`.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <symbol id="star" fill="none" stroke="currentColor" stroke-width="1.75">
      <path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.6l6.2-.9Z"/>
    </symbol>
    <symbol id="star.fill" fill="currentColor">
      <path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.6l6.2-.9Z"/>
    </symbol>
  </defs>
</svg>
```

Partial packs work: missing symbols fall back to Lucide. Outline and filled
symbols are separate, such as `star`/`star.fill`, `map`/`map.fill`, and
`settings`/`gearshape.fill`. Use `currentColor` for theme-aware fills and strokes;
explicit colors are kept. Convert typography to paths before export.

The complete symbol vocabulary is in the template. Files can contain up to
256 KB, with up to 32 KB per normalized symbol. Unsupported or duplicate IDs are
rejected with a message; the previous choice remains active when import fails.

## Location markers

Open **Settings → Location Marker → + (beside Brake)**. The import popup includes the template and artwork requirements. It accepts a
standalone SVG, rather than an icon sprite. Use a valid `viewBox`, center the
artwork on a square canvas, and leave some padding. The map renders it at 50 px
with its center anchored to the location. It is saved independently of icon sets.
The maximum file size is 32 KB.

Both import types accept paths, circles, ellipses, rectangles, lines, polylines,
polygons, groups, transforms, and inline SVG fill/stroke attributes. CSS, live
text, images, scripts, animations, gradients, filters, masks, clipping paths,
external resources, and `<use>` references are unsupported. Flatten these
features into simple vector shapes before export.

## Development

The native file picker uses Expo DocumentPicker with `copyToCacheDirectory` so
Expo FileSystem can read the selection immediately. Template export uses Expo
Sharing. These modules require a new native app build when upgrading an existing
development client or release binary; a JavaScript update alone cannot add them.

[DocumentPicker documentation](https://docs.expo.dev/versions/latest/sdk/document-picker/) ·
[Sharing documentation](https://docs.expo.dev/versions/latest/sdk/sharing/)

The icon template includes Lucide/Feather license notices. Attribution is also
saved in [LUCIDE-LICENSE.txt](../assets/templates/LUCIDE-LICENSE.txt).
