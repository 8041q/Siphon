# Siphon Privacy Policy

Effective: 18 September 2026

Siphon is an open-source fuel-station information app developed and maintained by 8041q. It has no user accounts and does not sell personal data.

## Information handled by Siphon

Favorites, vehicle details, preferences, the last location, custom location-marker images, cached prices, price history, and cached route distances are stored locally on the device. Custom images are selected through the operating-system picker and are not uploaded by Siphon.

When a user explicitly asks Siphon to locate them, the app requests foreground location permission. The coordinates show nearby stations and are sent over HTTPS to the public OSRM routing service to calculate road distances. Siphon does not operate OSRM and does not store precise locations on Siphon servers.

## Online services and data sources

Siphon downloads public fuel-station and market datasets from the SiphonAPI repository hosted by GitHub. Portuguese station data is derived from DGEG public information; Spanish station data is derived from the Spanish government's open-data service.

Maps use OpenFreeMap and OpenStreetMap data. Routing uses the public OSRM service and OpenStreetMap data. App updates may be delivered through EAS Update, Google Play, or GitHub Releases. These services necessarily receive network information such as an IP address and user agent when a device connects to them, under their respective privacy terms.

## Advertising, purchases, and analytics

The current release has monetization disabled. It does not request advertising identifiers, load ads, offer in-app purchases, or use an analytics service. The policy and in-app disclosures must be updated before those features are enabled.

## Retention and deletion

Siphon has no account or developer-operated user database. Local information remains until it is cleared in the app, the app's storage is cleared in system settings, or the app is uninstalled. Requests sent to external services are subject to those services' retention practices.

## Security and children

Network requests use HTTPS. Siphon is intended for people aged 13 and above and is not directed to children under 13.

## Contact

The deployed policy injects the dedicated support address from the `PUBLIC_SUPPORT_EMAIL` repository secret. Release validation fails until that secret and the corresponding EAS `EXPO_PUBLIC_SUPPORT_EMAIL` variable are configured. Issues may also be reported through <https://github.com/8041q/Siphon/issues>.
