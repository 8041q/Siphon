# Siphon Android release automation

## One-time setup

For the next steps after identity approval, use `docs/FIRST-PLAY-RELEASE.md`. The first AAB can be uploaded manually to internal testing before configuring automated submission credentials.

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

`.easignore` excludes local credentials/environment files, Git history, workflows, release documents, store artwork/screenshots, tests, and local scripts from cloud build uploads. The app source, runtime assets, native plugins, dependency lockfile, `eas.json`, and public contact configuration remain included. GitHub quality gates still run on the full checkout before EAS uploads the reduced build inputs. Keep the shared exclusion rules synchronized with `.gitignore`; EAS prioritizes `.easignore` when it exists.

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
- Confirm the final manifest has target SDK 36 and lacks `RECORD_AUDIO`, unrestricted `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, Google `AD_ID`, all three `ACCESS_ADSERVICES_*` permissions, Install Referrer, and `com.android.vending.BILLING`.
- Compare the AAB/APK upload-signing certificate with the EAS credential recorded below. Google Play App Signing may use a separate distribution certificate; record that certificate from Play Console after enrollment.
- Confirm release network traffic contains no ad or Billing requests.
- Confirm the merged manifest has no `MobileAdsInitProvider`, AdMob `AdService`, Billing version metadata, or Expo `LocationTaskService`. The `withReleaseManifest` plugin removes these unused components while monetization is disabled; ordinary one-shot foreground location remains available.
- Exercise the location disclosure and verify OSRM receives coordinates only after the user accepts and invokes location.

## Android upload signing certificate

EAS generated the default JKS keystore for `com.ctr_8041q.siphon` on 30 September 2026. The public certificate fingerprints shown by `eas credentials -p android` for the `preview` profile are:

- SHA-1: `69:84:06:C7:C8:28:EC:23:CB:CE:EB:23:06:B2:D8:3E:3F:5A:39:10`
- SHA-256: `13:15:BF:12:D9:7E:9C:B5:2E:AB:3C:42:09:A0:4F:56:B1:36:56:E4:0F:3E:0B:65:A4:59:4D:91:20:60:9B:A2`

Keep the private keystore on EAS; do not commit exported credentials. Verify that the production profiles use this same EAS keystore before the first Play upload. Once enrolled in Play App Signing, also record Google's app-signing certificate separately.

## First Android cloud-build check

On 1 October 2026, preview build `11d65898-c9f1-4f42-803e-6e6d489082f3` completed from commit `1cde588` using the EAS keystore above. Its APK SHA-256 is `f88208aef71186768c5f6715757b516045e6786724dda0b1c1549b4189d6301e`. Inspection with Google's `aapt2 dump badging` confirmed package `com.ctr_8041q.siphon`, version `1.0.0`/code `1`, target SDK 36, and no `RECORD_AUDIO`, Google `AD_ID`, `ACCESS_ADSERVICES_*`, Install Referrer, or Play Billing permission.

This is a preview APK, not a Play AAB or a completed policy audit. The compiled app still contains AdMob and Billing SDK components, including `MobileAdsInitProvider`; verify on-device that monetization stays inactive and no ad or billing network traffic occurs before making the Play Ads/Data Safety declarations. Inspect the final production AAB separately.

### Verified native cleanup

On 1 October 2026, preview build [`6027436e-1219-480f-80c2-9c229083ebde`](https://expo.dev/accounts/ctr_8041q/projects/siphon/builds/6027436e-1219-480f-80c2-9c229083ebde) completed from commit `d36c486`. Its APK SHA-256 is `f52741fa8cde42b66493b3e77c14dfbba354a9afc2f5e747d3b609ae4d06ff5b`.

Google's `aapt2` confirmed package `com.ctr_8041q.siphon`, version `1.0.0`/code `1`, target SDK 36, and the absence of all blocked permissions above. The compiled manifest also lacks `MobileAdsInitProvider`, AdMob `AdService`, AdMob configuration metadata, Billing version metadata, and Expo `LocationTaskService`; no location foreground-service type remains. The certificate extracted from the APK's v2 signing block matches both EAS fingerprints recorded above. This certificate comparison does not replace complete signature verification or inspection of the future production AAB.

The SDK libraries and Billing proxy activities remain bundled for future use. WorkManager's generic foreground-service entry and permission are left intact because they are transitive dependencies; Siphon does not start that service. On-device traffic inspection and a fresh-install/upgrade smoke test of this replacement APK remain required before completing Play declarations.

The [GitHub quality-gates run](https://github.com/8041q/Siphon/actions/runs/36833031875) passed at commit `baba563`: clean dependency installation, release configuration, store assets, TypeScript, all 12 tests, Expo Doctor, and Android export. That commit adds only a CSS type declaration to fix clean-checkout TypeScript validation; it does not change the runtime of the inspected APK.
