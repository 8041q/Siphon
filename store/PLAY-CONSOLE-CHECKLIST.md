# Google Play release checklist

## Store listing

- Set `en-US` as the default listing and add `pt-PT` as the only localized listing. Use the text in `store/listings/` and the matching assets in `store/play-upload/`.
- Upload the three phone screenshots in numbered order and the 1024×500 feature graphic for each listing. The app icon is `store/graphics/store-icon.png`.
- Use the committed files in `store/play-upload/` and run `npm run validate:store` before upload. If you add new source images under `store/screenshots/` and `assets/store/`, run `npm run prepare:store` to regenerate the upload files first.
- Keep English, Portuguese, Spanish, French, and German available inside the app. A two-language store listing does not restrict in-app language support.

## Account and package gates

- Complete developer identity, contact, payment-profile, and physical-device verification.
- Confirm whether Play Console requires the new-personal-account closed test. If shown, keep at least 12 testers continuously opted in for 14 days before applying for production access.
- Enrol `com.ctr_8041q.siphon` in Android developer verification and register the Play App Signing certificate plus any distinct GitHub APK signing certificate.
- Enable Play App Signing and configure the Google Play service account in EAS credentials.
- Add `EXPO_TOKEN` as a GitHub Actions secret. The public contact is committed in `release-contact.json`.
- Test the first internal Play upload manually or with EAS Submit, then set the `PLAY_SUBMIT_ENABLED` repository variable to `true` once the service-account path works.
- Enable GitHub Pages with GitHub Actions as its source, run **Publish privacy policy**, and confirm <https://8041q.github.io/Siphon/privacy/> is public before submission.

## App content answers for the monetization-disabled build

- Ads: **No**, only after release network inspection confirms no ad requests and the final manifest lacks Google `AD_ID` and Android `ACCESS_ADSERVICES_*` permissions.
- Verify that the release manifest also lacks AdMob's `MobileAdsInitProvider` and `AdService`, and Expo's unused `LocationTaskService`. Siphon requests a single foreground position and does not use continuous/background location or a location foreground service.
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
