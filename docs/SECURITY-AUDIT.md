# Dependency security audit

Last reviewed: 18 September 2026

`npm audit --omit=dev` reports no critical or high-severity advisories after pinning patched `@xmldom/xmldom` and `brace-expansion` transitive versions through npm overrides.

`@xmldom/xmldom` is intentionally pinned to the patched 0.8 compatibility line (`0.8.15`). Expo SDK 57's plist parser still uses the 0.8 `DOMParser.parseFromString(xml)` API; forcing the breaking 0.9 line makes clean iOS prebuilds fail because 0.9 requires an explicit MIME type.

The remaining 19 moderate findings are in Expo configuration/build tooling and its transitive packages (`@expo/config*`, `xcode`, `uuid`) or are npm's downgrade recommendations for the installed Expo/Router/MapLibre/vector-icon integrations. They are not known runtime data paths in the compiled app. Suggested automatic fixes would downgrade Expo 57 to Expo 46 or otherwise replace SDK-compatible packages, so `npm audit fix --force` must not be used.

Recheck this document whenever Expo 57 receives another patch or before upgrading the Expo SDK. Any override change must pass Expo Doctor, TypeScript, Android export and an EAS native build.
