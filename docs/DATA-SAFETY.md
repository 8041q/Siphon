# Data Safety and privacy declarations

This guide describes the current monetization-disabled release. Check the exact uploaded artifact and current Play form before submitting. The public privacy policy has one source: [privacy/index.template.html](privacy/index.template.html), published by the privacy-pages workflow with contact details from `release-contact.json`.

## Data handled

| Data | Behavior and declaration |
| --- | --- |
| Precise and approximate location | Optional, for app functionality. A locate action, OSRM disclosure, and foreground permission precede GPS requests. The OS may supply approximate coordinates; both forms of location can be sent to OSRM. |
| Device or other IDs | EAS Update sends a persistent random installation ID in `EAS-Client-ID`, for update functionality. This is collected even though it is not an advertising ID. Assess any additional purposes against Expo's processing. |
| Favorites, vehicles, settings, custom images, and caches | Stored locally; no upload. |
| Advertising ID and purchase data | No collection in the disabled app paths; no SDK activity in release traffic. |
| Accounts | No signup, login, or user-account backend. |

For OSRM, assess Google's sharing exceptions for prominent disclosure/consent separately from collection. Public OSRM is an external recipient; do not assume it is a contracted service provider or that request data is retained only in memory. Do not mark processing as ephemeral without confirming its retention/logging behavior.

Expo describes itself as processing end-user data on the developer's behalf; this may support the service-provider sharing exception for EAS Update. Network services also receive connection metadata such as IP addresses and user agents. Assess any location inferred by providers against their actual practices.

## Transport and disabled SDKs

OSRM route and table requests use `https://router.project-osrm.org`, with no HTTP fallback. Maps and their resource definitions, GitHub data/releases, and EAS Update are configured for HTTPS. The OSRM provider does not enforce the protocol of a future replacement base URL; preserve HTTPS when changing it.

Every EAS build profile sets `EXPO_PUBLIC_MONETIZATION_ENABLED=false`. Ad/consent calls are gated, donation UI is not mounted, and release configuration removes advertising/Billing permissions and AdMob automatic startup components. SDK classes remain bundled, so source flags alone cannot prove no SDK data collection. Use the release checklist in [RELEASE.md](RELEASE.md).

`updates.checkAutomatically: NEVER` does not disable EAS Update: the app explicitly calls `checkForUpdateAsync()` when startup checking is enabled (the default) or a user checks manually. The installed SDK attaches the installation ID to those requests.

## Verification baseline

On 1 October 2026, live OSRM route/table requests using public sample coordinates and OpenFreeMap style/tile definitions returned status 200 over HTTPS with no redirects. The inspected native-cleanup preview APK lacked the blocked ad/Billing permissions and AdMob startup components. Its SHA-256 was `f52741fa8cde42b66493b3e77c14dfbba354a9afc2f5e747d3b609ae4d06ff5b`. Release configuration, TypeScript, and all 12 existing tests passed.

That preview inspection does not verify the production AAB or device traffic. Before submission, check the exact candidate, capture its network behavior, and ensure the public policy covers both location and the EAS installation ID.

References: [Google Data Safety definitions and exceptions](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [ads declaration](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en), [AdMob SDK disclosure](https://developers.google.com/admob/android/privacy/play-data-disclosure), [Expo client ID](https://docs.expo.dev/eas/observe/reference/client-id/), and [Expo end-user privacy](https://expo.dev/privacy-explained).
