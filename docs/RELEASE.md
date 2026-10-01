# Android release guide

Siphon uses the EAS project [@ctr_8041q/siphon](https://expo.dev/accounts/ctr_8041q/projects/siphon) and Android package `com.ctr_8041q.siphon`. Keep that package name unchanged. Ads and purchases are disabled in every build profile.


## Versions for a new store release

The public version has **one source: `package.json` → `version`**. `app.config.js` reads it and sets Expo's `version`; there is no duplicate version in `app.json`. EAS does not change the public app version for you.

| Value | Source | How it changes |
| --- | --- | --- |
| Public app version / Android `versionName` | `package.json` → `version`, supplied to Expo by `app.config.js` | Set `X.Y.Z`, without a `v` prefix. |
| npm package version | `package.json` → `version` | The same source; the release validator checks the resolved Expo config. |
| Lockfile package version | Root package entries in `package-lock.json` | Updated by `npm version`; commit the lockfile too. |
| Android `versionCode` | EAS remote version for the project/package | `production` increments it automatically. Do not reset it for a public `1.0.0` release or edit generated Gradle files. |
| OTA runtime version | `app.json` → `runtimeVersion.policy: appVersion` | Follows the resolved app version automatically. |
| Git release tag | Tag on the release commit | Must be `vX.Y.Z`, matching the package version. |
| Version displayed in Settings | Installed native app version | Read automatically by `useAppUpdate`; no separate edit. |

For example, to prepare `1.0.1`:

1. Run `npm version 1.0.1 --no-git-tag-version`. This updates `package.json` and `package-lock.json`, without committing or creating a Git tag.
2. Run `node scripts/validate-release.mjs --tag v1.0.1` to check the resolved version/tag. Complete the release checks below before pushing the tag.
3. Stage and commit the intended release source, including `package.json` and `package-lock.json`, before tagging that commit. Then run `git tag v1.0.1` and `git push origin v1.0.1`.

You can edit just the `version` field in `package.json`; using `npm version` is recommended because it also synchronizes the derived lockfile metadata. No edit to `app.json`, `app.config.js`, or the runtime policy is needed for a version bump. Keep the commit step: a tag never includes uncommitted edits.

Use a patch version such as `1.0.1` for fixes, a minor version such as `1.1.0` for compatible features, and a major version such as `2.0.0` for major changes. For the first release, keep the existing `1.0.0` values and use tag `v1.0.0` if using the automated workflow.

EAS manages the Android build code separately from the public version. Multiple release candidates can share `1.0.0` while having different build codes. The `preview` and `development` profiles have no automatic increment configured; `production-github` explicitly disables it so the APK built immediately after the production AAB can reuse its code. Avoid starting another production build between those two builds.

Generated local `android/` and `ios/` folders are excluded from EAS uploads. EAS generates the native projects from Expo configuration and injects its remote build number. Library, Expo SDK, Android SDK, Kotlin, and CMake versions are tool/dependency versions; they do not need to match the public app version.

See [Expo app version management](https://docs.expo.dev/build-reference/app-versions/).

## Image paths

| Path | Use |
| --- | --- |
| `assets/icon.png`, `assets/icon-dark.png` | Default/light icon and iOS dark appearance |
| `assets/adaptive-icon.png`, `assets/adaptive-monochrome.png` | Android adaptive and themed launcher icons |
| `assets/splash-icon.png`, `assets/splash-icon-dark.png` | Native launch logos, selected by system appearance |
| `assets/splash-screen.png`, `assets/splash-screen-dark.png` | Full-page artwork during map loading, selected by the app theme |
| `assets/favicon.png` | Web favicon |
| `assets/brands/*.png` | Editable brand logos and pin template for `npm run markers:generate` |
| `assets/brands/markers/*.png` | Generated map pins used by the app |
| `assets/userLocationMarker/*.svg` | Editable SVG originals; runtime SVGs are embedded in `src/components/userLocationMarkers/markers.tsx` |
| `store/play-upload/store-icon.png` | Shared 512×512 Play Store listing icon |
| `store/play-upload/{en-US,pt-PT}/feature-graphic.jpg` | Localized 1024×500 Play Store feature graphics |
| `store/play-upload/{en-US,pt-PT}/phone/{01-home,02-prices,03-market}.png` | Localized phone screenshots |

The Play Store images have one copy each and are excluded from EAS builds by `/store` in `.easignore`. Replace the phone screenshots with 24-bit RGB PNGs; preparation makes a small centered crop when needed, while already valid 9:16 files stay unchanged. Keep your own original capture separately if you need to preserve uncropped pixels.

Launcher icons and native splash changes require a new binary. Expo's native splash uses a centered logo; the full-page artwork is displayed by the app while the map data loads. Verify light/dark splash and launcher appearances in a preview or production build, since Expo Go and development builds do not fully reproduce native splash behavior. See [Expo's splash screen documentation](https://docs.expo.dev/versions/latest/sdk/splash-screen/).

## First Play upload

Build from the intended release source:

```bash
npx eas-cli@24.7.0 build --platform android --profile production
```

Download the AAB from that exact build, inspect it using the checklist below, and upload it to **Testing → Internal testing**. Add testers and install through Google Play. A manual upload does not require a Google service-account key or `EXPO_TOKEN`. Keep the build ID and artifact for later reference.

Complete any required closed test, then promote the tested AAB to production. If Play and sideload signatures differ, an installation cannot upgrade across them; uninstalling removes local app data unless restored from a backup.

## Automated release candidates

After the first manual upload works:

1. In [Google Cloud Console](https://console.cloud.google.com/), select or create a project. Enable **Google Play Android Developer API** (`androidpublisher.googleapis.com`) under **APIs & Services → Library**.
2. Under **IAM & Admin → Service Accounts**, create a service account (for example, `siphon-play-submit`). Open its **Keys** tab, select **Add key → Create new key → JSON**, and save the key outside the repository. Copy the service-account email.
3. In **Play Console → Users and permissions → Invite new users**, invite that email and select Siphon under **App permissions**. Grant the upload/release permissions listed in [Expo's service-account guide](https://github.com/expo/fyi/blob/main/creating-google-service-account.md): view app information, edit/delete draft apps, release to testing tracks, manage testing tracks/testers, manage store presence, and release to production/use Play App Signing. Scope access to Siphon; administrator access is unnecessary. Granting production permission does not change this workflow's internal-testing destination.
4. Upload the JSON key to EAS with:

   ```bash
   npx eas-cli@24.7.0 credentials --platform android
   ```

   Select the `production` build profile, then **Google Service Account → Upload a Google Service Account Key**. Alternatively, open the project's EAS dashboard → **Credentials → Android → com.ctr_8041q.siphon → Service Credentials → Add a Google Service Account Key**. This submission key is separate from the Android signing key.
5. Create an Expo access token from your Expo account's **Access tokens** settings with access to the Siphon project. In the GitHub repository, open **Settings → Secrets and variables → Actions → Secrets → New repository secret** and save it as `EXPO_TOKEN`. Reuse the existing secret if already configured.
6. Test submission using a new production AAB/build code that has not already been uploaded to Play. Build a new candidate if v1's AAB was uploaded manually; do not resubmit that same code. Keep the public version `1.0.0` if this is still a candidate for v1. Run:

   ```bash
   npx eas-cli@24.7.0 submit --platform android --profile internal --id BUILD_ID
   ```

7. After successful submission, open **GitHub repository → Settings → Secrets and variables → Actions → Variables → New repository variable**. Set name `PLAY_SUBMIT_ENABLED` and value `true` (a repository variable, not a secret).

Future matching tag pushes now build both artifacts and submit the exact AAB to **Play internal testing**, provided all workflow checks pass. Public production rollout and converting the GitHub prerelease to a regular release remain manual. The initial manual upload does not have to be live in production before you configure automation; complete the initial upload/release setup and verify API submission first. See [EAS submission setup](https://docs.expo.dev/submit/android/).

After preparing and committing the version/source changes described above, create and push the matching tag. For example, for a committed `1.0.1` release:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Use a new version/tag for subsequent releases. A tag points to a commit; uncommitted local changes are not included. A normal branch push does not trigger this release workflow.

The committed `.github/workflows/release.yml` runs on pushed `v*` tags:

| Step | Automatic or manual? |
| --- | --- |
| Validate versions/tag and listing assets; run quality checks | Automatic. A failure stops later steps. |
| Build Play AAB using `production` | Automatic after checks; increments the remote Android build code. |
| Build GitHub APK using `production-github` | Automatic after the AAB; checks that both build codes match. |
| Create GitHub release with AAB, APK, generated notes, and SHA-256 checksums | Automatic **prerelease**, downloadable from GitHub but excluded from the app's latest-release feed. |
| Submit that exact AAB to Play | Automatic only when repository variable `PLAY_SUBMIT_ENABLED` equals `true`, using the `internal` submit profile. |
| Release to all Play users | Manual promotion/rollout in Play Console after testing and any required review. |
| Mark the GitHub prerelease as a regular release | Manual after the corresponding version is available on Play production. This makes it eligible for the app's binary-update feed. |

The workflow needs GitHub Actions enabled, the workflow in the tagged commit, the `EXPO_TOKEN` repository secret, and working EAS signing credentials. Play submission additionally needs the configured Google service-account key and Play permissions. These are prerequisites, not settings enabled by pushing a tag.

Uploading or publishing your first version manually does **not** enable later automatic submission. Complete the service-account setup and submission test, then enable `PLAY_SUBMIT_ENABLED` explicitly. If the variable is absent or false, the workflow still creates the GitHub prerelease but skips Play submission; upload its AAB manually.

The `internal` profile in `eas.json` uses `track: internal` and `releaseStatus: completed`: successful submission rolls out to eligible internal testers, subject to Play processing. It does not target production. Running a standalone `eas build --profile production` also only builds the artifact; this workflow performs submission with a separate `eas submit` command. See [EAS submission](https://docs.expo.dev/submit/android/).

Promote the tested AAB manually, then edit its GitHub prerelease and clear the prerelease flag after Play production is available. Both public Android distributions use GitHub's latest regular release to discover newer binaries, so this final GitHub step matters for in-app update notifications.

References: [Play app setup](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en), [testing tracks](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en), and [EAS submission](https://docs.expo.dev/submit/android/).
