# Data Safety working declaration

This document is a release checklist, not a substitute for inspecting the final binary and current Google Play form wording.

| Data or behavior | Release behavior | Proposed declaration |
| --- | --- | --- |
| Precise location | Requested only after the user taps locate and accepts the OSRM disclosure; sent to public OSRM for road-distance calculation | Optional; app functionality; transmitted off-device; not associated with an account |
| Approximate/default location | Default map coordinates and cached last position are stored locally | Not collected by the developer |
| Custom marker image | Selected using the system picker and stored locally | Not collected or shared |
| Favorites, vehicles, preferences, history | Stored locally | Not collected or shared |
| Advertising ID | Blocked from the Android manifest while monetization is disabled | Not collected |
| Ads and Play Billing | Code retained but initialization/UI disabled; `AD_ID` and `BILLING` permissions blocked | Ads declaration: No; no purchase data collected |
| Accounts | None | Account deletion requirement not applicable |

Before answering the form, inspect release-build traffic and the merged manifest. Treat OSRM as a third-party recipient unless current Play guidance clearly classifies it otherwise for this integration.
