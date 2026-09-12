# Siphon Android release automation

## Release trigger

A pushed semantic version tag (`v1.2.3`) starts `.github/workflows/release-android.yml`.
The tag must match both `expo.version` in `app.json` and `version` in `package.json`.

Example:

```bash
git tag v1.2.3
git push origin v1.2.3
```

## What the tag workflow does

1. Validates the tag/version pair.
2. Builds the Google Play AAB with the EAS `production` profile.
3. Builds the sideload APK with `production-github` after the Play build, so both use the same current remote Android version code when remote versioning is enabled.
4. Creates/updates the matching GitHub Release and uploads the APK.
5. Optionally submits the AAB to Google Play when the GitHub repository variable `PLAY_SUBMIT_ENABLED` is set to `true`.

## Required GitHub configuration

### Secret

- `EXPO_TOKEN`: Expo personal access token used by GitHub Actions to call EAS.

### Repository variable

- `PLAY_SUBMIT_ENABLED`: leave unset/`false` while Play identity/service-account setup is pending. Set it to `true` when automated submission is ready.

## Required EAS / Google Play setup before enabling Play submission

Upload the Google Play service-account JSON to the Android service credentials for this EAS project. Do not commit the JSON key to GitHub.
The `submit.production.android` profile targets the production track with a completed release.

## App update channels

- Google Play build: `production`
- GitHub APK build: `production-github`
- Internal preview: `preview`
- Development client: `development`

The app reads the native `expo-updates` channel to decide which binary updater to use. This value is embedded in the binary and remains reliable after OTA updates.

## User-facing update behavior

`Check for updates` performs two compatible checks:

1. EAS Update checks for a JS/assets update compatible with the installed runtime.
2. Public Android builds also compare the installed app version with the latest GitHub Release tag.

If a newer binary exists:

- Play build opens the app listing in Google Play.
- GitHub build opens the direct APK asset from the latest GitHub Release (or the release page if the APK asset is missing).

If only an EAS update exists, Siphon downloads it and reloads the app after the user taps Install update.

Siphon does not request `REQUEST_INSTALL_PACKAGES` and does not attempt to silently/self-install APK files.

## OTA-only hotfixes

Use the `Publish Production OTA Update` GitHub Action manually for changes that do not require a native rebuild. Choose the exact Git ref to publish. The workflow publishes the same source ref to both production channels.

Because `runtimeVersion` uses the `appVersion` policy, the selected ref's `app.json` version must match the binary version you intend to update.

## Ads

Rewarded ads use Google test IDs in development/preview builds. Public `production` and `production-github` binaries use the production rewarded unit IDs.
