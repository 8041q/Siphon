# Siphon

Siphon is a fuel-station app for Portugal and Spain, built with React Native, Expo, and MapLibre. It uses public government price data processed by [SiphonAPI](https://github.com/8041q/SiphonAPI).

## Features

- Map and station search with fuel, brand, price, country, and distance filters.
- Favorites, vehicle preferences, station details, and directions.
- Up to 90 days of locally cached price history, plus a fuel-market dashboard.
- Foreground location on request, with OSRM road distances and local estimates when routing is unavailable.
- Light/dark themes, color palettes, icon styles, and custom location-marker images.
- English, Portuguese, Spanish, French, and German.

The current release has ads disabled. Appearance options are available without watching ads. Monetization remains disabled until permission for commercial use of DGEG data is obtained. Ads usage is 100% optional.

## Development

Node.js 22 (the CI version). Android development requires Android Studio and/or an emulator as a connected device; iOS requires macOS, Xcode, and CocoaPods. Native dependencies require a development build rather than Expo Go.

```bash
npm ci
npm run android
# On macOS:
npm run ios
```

Configuration lives in `app.json`, `app.config.js`, and `plugins/`. Generated `android/` and `ios/` folders are ignored by Git and excluded from EAS uploads. After changing native configuration, regenerate the relevant project with `npx expo prebuild --clean --platform android` (or `ios`) before building. Clean prebuild replaces local native edits. Keep Android CMake pinned to `3.22.1`.

## Checks

```bash
npm run validate:config
npm run typecheck
npm test
npm run doctor
npm run export:android
```

`npm run smoke:api` checks the public data endpoints; `npm run validate:store` checks the prepared Play listing assets. Run `npm run markers:check` after changing station-marker assets.

Keep dependency versions compatible with the Expo SDK. The npm overrides retain patched `@xmldom/xmldom` 0.8 and `brace-expansion` versions. Do not force xmldom 0.9: its parser API breaks the current Expo plist tooling. Review `npm audit --omit=dev` before releases; avoid `npm audit fix --force`, which can replace SDK-compatible packages.

## Data and privacy

Station data is downloaded over HTTPS from the SiphonAPI GitHub repository. The app loads cached stations immediately, checks the manifest, and refreshes changed or missing data. Price history is optional and limited to a rolling 90-day device cache. Sync uses a persistent request budget, cooldown, and server backoff; offline use relies on data already downloaded.

Maps use OpenFreeMap and OpenStreetMap. GPS is requested only after a locate action and routing disclosure. Coordinates go to OSRM over HTTPS to calculate road distances; there is no continuous location tracking. Favorites, vehicles, settings, and custom marker images stay on the device. EAS Update requests include a random installation ID.

Read the [privacy policy](https://8041q.github.io/Siphon/privacy/) and [Data Safety guide](docs/DATA-SAFETY.md).

## Releases and updates

Android distribution uses EAS: `preview` builds an internal APK, `production` builds a Play AAB, and `production-github` builds a sideload APK.

The public app version has one source: `package.json` → `version`. `app.config.js` uses it for Expo and the OTA runtime follows it. For a new binary release, run `npm version X.Y.Z --no-git-tag-version` (which also updates the lockfile), commit the release source, then create and push tag `vX.Y.Z`. See the [release guide](docs/RELEASE.md) for first-upload and automatic Play submission setup.

With **Settings → Updates → Check for updates on startup** enabled (the default), the app checks for EAS updates once per launch. Both public Android distributions also check GitHub Releases for newer binary versions. Turning the setting off skips these startup checks; manual checks remain available. **Settings → Updates** can check again and apply an available update:

- EAS updates download and reload the app when selected.
- Play builds open Google Play for a newer binary.
- GitHub builds open the APK asset or release page.

The check itself does not download an update. Native changes require a new binary.
Public iOS binary distribution is not configured.

## Documentation and support

- [Release guide](docs/RELEASE.md)
- [Data Safety and privacy declarations](docs/DATA-SAFETY.md)
- [Data client reference](docs/API.md)
- [Privacy policy source](docs/privacy/index.template.html)

Contact: [8041q@proton.me](mailto:8041q@proton.me), or [open an issue](https://github.com/8041q/Siphon/issues). Public contact details are maintained in `release-contact.json`.
