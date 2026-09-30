# Siphon Android release automation

## One-time setup

The app is linked to the `@ctr_8041q/siphon` EAS project. Sign in to the `8041q` Expo account with access to that team before building.

1. Complete the Play account and package gates in `store/PLAY-CONSOLE-CHECKLIST.md`.
2. Establish Android credentials with one manual `eas build --platform android --profile preview` run.
3. Upload/configure the Google Play service-account credential through EAS; never commit its JSON key.
4. Add `EXPO_TOKEN` as a GitHub Actions secret. The public developer name and support email are committed in `release-contact.json` and used by both the app and policy.
5. Confirm the contact mailbox receives messages.
6. Set the GitHub repository variable `PLAY_SUBMIT_ENABLED` to `true` only after EAS Submit is configured and the first internal upload path has been tested. Until then, the tag workflow still creates the AAB and APK as a GitHub prerelease.
7. Enable GitHub Pages from GitHub Actions, run **Publish privacy policy**, and confirm the public URL loads.

Monetization is explicitly disabled in every EAS build profile. Do not change that flag until the DGEG commercial-use gate and the related privacy/ad review are complete.

The Android CMake version is pinned to `3.22.1` in `app.json` because the current native build depends on it. Keep that version when changing other Expo build properties.

## Binary release

The committed version is the source of truth. Update `expo.version` in `app.json` and `version` in `package.json` to the same `X.Y.Z`, commit, then tag that commit:

```bash
npm run validate:config
git add app.json package.json package-lock.json
git commit -m "release: v1.2.3"
git tag v1.2.3
git push origin main v1.2.3
```

`.github/workflows/release.yml` then:

1. Rejects version/tag mismatches and missing release configuration.
2. Runs TypeScript, tests, Expo Doctor and an Android export.
3. Builds the `production` AAB first, allowing EAS remote versioning to increment `versionCode`.
4. Builds the `production-github` APK second and verifies its version code matches the AAB.
5. Downloads both exact artifacts and produces SHA-256 checksums.
6. Creates a GitHub prerelease containing the APK, AAB and checksums, so the artifacts remain available even if Play submission fails.
7. Submits the exact AAB build to the Play internal-test track when `PLAY_SUBMIT_ENABLED` is `true`.

After testing, promote the same AAB manually in Play Console. Publish the matching GitHub prerelease only after the Play production version is available; `/releases/latest` ignores prereleases, which prevents Play users being prompted for a version their store cannot install yet.

## Update channels

- Play binary: `production`
- GitHub APK: `production-github`
- Internal preview: `preview`
- Development client: `development`

The app checks EAS Update for its embedded channel. Public Android builds also use the latest published GitHub Release as the binary-version feed: Play builds open Google Play, while GitHub builds open the APK/release page.

## OTA updates

Run the `Publish EAS update` workflow manually. Preview publishes only to `preview`. Production uses the protected `production-ota` GitHub environment and publishes the same source to both public channels.

The workflow compares the selected commit with the latest tag and rejects changes to native/runtime-affecting configuration, packages, plugins or app identity assets. Such changes require a new binary version and tag.
OTA publishing is intentionally unavailable until the first tagged binary release establishes a comparison baseline.

## Required manual verification

- Install the Play internal-track AAB and review the pre-launch report.
- Confirm the final manifest has target SDK 36 and lacks `RECORD_AUDIO`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `AD_ID` and `com.android.vending.BILLING`.
- Record the AAB/APK signing certificate fingerprints.
- Confirm release network traffic contains no ad or Billing requests.
- Exercise the location disclosure and verify OSRM receives coordinates only after the user accepts and invokes location.
