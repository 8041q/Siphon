# First Play upload

On 1 October 2026, the developer confirmed that Play identity validation was approved and `com.ctr_8041q.siphon` was available. Keep that package name permanently. Availability is not confirmation of production access or completion of Android package registration; check those statuses in Play Console.

## First internal test: manual upload

1. Open Play Console and create **Siphon** if it does not exist. Select **App**, **Free**, default language **English (United States)**, and support email **8041q@proton.me**. Accept the required declarations and Play App Signing terms. Check the dashboard for any remaining contact/device verification tasks.
2. Complete the main English listing and add Portuguese (Portugal). Copy text from `store/listings/`, screenshots and feature graphics from `store/play-upload/`, and the icon from `store/graphics/store-icon.png`. Set privacy policy to `https://8041q.github.io/Siphon/privacy/`. Choose the appropriate category/tags and initial countries (Portugal and Spain match the current station coverage).
3. Complete **App content**: unrestricted access/no login, audience 13+, the content-rating questionnaire, and the privacy/Data Safety answers in `store/DATA-SAFETY.md`. Confirm **Ads: No** from the final release traffic inspection. Precise location sent to OSRM must be reflected in Data Safety; do not answer that no data ever leaves the device merely because there are no accounts. Complete any other forms the dashboard presents truthfully, including financial/health features if asked.
4. From the committed release source, build an AAB (the preview APK is not the Play upload):

   ```bash
   npx eas-cli@24.7.0 build --platform android --profile production
   ```

   The production profile uses the `production` update channel, disables monetization, and increments the remote Android version code. Keep the build ID and download the `.aab` from its Expo build page. Inspect this production artifact separately; the recorded inspection is currently for a preview APK.
5. In **Test and release > Testing > Internal testing**, create a release and enroll in Play App Signing when prompted. Upload that exact AAB, add release notes, resolve the Console's errors, and publish it to the internal track. This manual upload needs no Google service-account key or GitHub token.
6. Add your Google account and other testers to the internal tester list, share the opt-in link, then install from Google Play. Test fresh install/upgrade, denied/allowed location, disclosure, map/search/details, custom images, offline behavior, all five app languages, and updates. Inspect network traffic for unexpected ad/Billing requests and coordinates before the disclosed action. Review the pre-launch report when available.
7. Check the production-access dashboard. If the new-personal-account requirement applies, create a **closed** test and keep at least **12 testers continuously opted in for 14 days**, then apply for production access. Internal testing does not fulfill that closed-test requirement.
8. Promote the tested AAB through the required closed/production tracks. Publish the matching GitHub prerelease only once the Play production version is available.

Google Play may sign delivered APKs with a different certificate from the EAS/GitHub APK. Record the Play app-signing SHA-256 from **App integrity** and verify Android developer/package registration. If a preview/GitHub installation cannot be upgraded by the Play installation because the certificates differ, uninstalling it removes its local data; preserve any needed local data first.

## Enable tag automation after the first upload works

1. Create a Google Cloud service account for Siphon, enable the **Google Play Android Developer API**, and invite its service-account email through Play Console **Users and permissions**, scoped to Siphon. Follow [Expo's service-account guide](https://github.com/expo/fyi/blob/main/creating-google-service-account.md) for the required permissions. Do not grant account-wide admin or financial access.
2. Download its JSON key to a private location outside the repository. Upload it in the [Siphon EAS project's](https://expo.dev/accounts/ctr_8041q/projects/siphon) **Credentials > Android > com.ctr_8041q.siphon > Service Credentials**, or run `npx eas-cli@24.7.0 credentials --platform android`, select `production`, then **Google Service Account > Upload a Google Service Account Key**. It is an EAS submission credential, not an app build input.
3. Create an Expo access token with the necessary project/team access. In GitHub **Siphon > Settings > Secrets and variables > Actions**, add it as a repository **secret** named `EXPO_TOKEN`. Never put its value in `eas.json`, `.env.example`, a workflow, or a commit.
4. Test submission of an exact, unused production build ID:

   ```bash
   npx eas-cli@24.7.0 submit --platform android --profile internal --id BUILD_ID
   ```

   Do not submit a version code already uploaded manually; build a new candidate or use manual track promotion for the existing artifact.
5. Only after automated internal submission works, add the GitHub repository **variable** `PLAY_SUBMIT_ENABLED=true`. Keep it unset/false beforehand. Configure required reviewers for the `production-ota` environment before using production OTA updates.
6. For the first tag-driven candidate, confirm `package.json` and `app.json` both say `1.0.0`, commit all release changes, then push `v1.0.0` on the chosen release commit. If that tag already exists, use a new committed version instead. Future versions require matching version files and tags. The tag workflow produces both distribution artifacts and submits only to internal testing.

References: [Google app setup](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en), [testing tracks](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en), [closed-test requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), and [EAS Android submission](https://docs.expo.dev/submit/android/).
