# Google Play release checklist

## Account and package gates

- Complete developer identity, contact, payment-profile, and physical-device verification.
- Confirm whether Play Console requires the new-personal-account closed test. If shown, keep at least 12 testers continuously opted in for 14 days before applying for production access.
- Enrol `com.ctr_8041q.siphon` in Android developer verification and register the Play App Signing certificate plus any distinct GitHub APK signing certificate.
- Enable Play App Signing and configure the Google Play service account in EAS credentials.
- Add `EXPO_TOKEN` and `PUBLIC_SUPPORT_EMAIL` as GitHub Actions secrets.
- Upload the first AAB manually in Play Console if the Developer API has not yet been initialized for this app. Then set the `PLAY_SUBMIT_ENABLED` repository variable to `true`.
- Add `EXPO_PUBLIC_SUPPORT_EMAIL` to the EAS `preview` and `production` environments.
- Enable GitHub Pages with GitHub Actions as its source, run **Publish privacy policy**, and confirm <https://8041q.github.io/Siphon/privacy/> is public before submission.

## App content answers for the monetization-disabled build

- Ads: **No**, after release network inspection confirms no ad requests and the final manifest lacks `AD_ID`.
- App access: unrestricted; no login.
- Target audience: 13 and above.
- Account deletion: not applicable; the app has no accounts.
- Precise location: optional and used for app functionality. It is transmitted to OSRM after an explicit locate action and prominent disclosure.
- Custom marker image: user-selected and kept locally.
- Content rating, privacy policy, support email, and data-safety forms completed from the inspected release binary.

## Candidate and production

- Upload only through the `internal` EAS submit profile.
- Install the internal-track build and review the pre-launch report.
- Test fresh install, upgrade, permission denial/approval, all five languages, offline/error behavior, map/search/details, custom images, update checks, and routing disclosure.
- Promote the tested AAB manually to the required closed or production track.
- Publish the matching GitHub prerelease only after Play production is available.
