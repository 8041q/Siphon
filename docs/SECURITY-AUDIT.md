# Dependency security audit

Last reviewed: 30 September 2026

`npm audit --omit=dev` reports no critical or high-severity advisories after pinning patched `@xmldom/xmldom` and `brace-expansion` transitive versions through npm overrides.

`@xmldom/xmldom` is intentionally pinned to the patched 0.8 compatibility line (`0.8.15`). Expo SDK 57's plist parser still uses the 0.8 `DOMParser.parseFromString(xml)` API; forcing the breaking 0.9 line makes clean iOS prebuilds fail because 0.9 requires an explicit MIME type.

The remaining 19 moderate findings include Expo configuration/build tooling (`@expo/config*`, `xcode`, `uuid`) and a `decode-uri-component` advisory reached through `expo-router` → `query-string`. The router chain may be present at runtime, so it must not be described as build-tool-only. npm's suggested automatic fixes would downgrade Expo 57 to Expo 46 or otherwise replace SDK-compatible packages; do not use `npm audit fix --force`. Reassess the router advisory when a compatible Expo Router or transitive patch is available.

Recheck this document whenever Expo 57 receives another patch or before upgrading the Expo SDK. Any override change must pass Expo Doctor, TypeScript, Android export and an EAS native build.
