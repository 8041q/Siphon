# Dependency security audit

Last reviewed: 30 September 2026

`npm audit --omit=dev` reports no critical or high-severity advisories after pinning patched `@xmldom/xmldom` and `brace-expansion` transitive versions through npm overrides.

`@xmldom/xmldom` is intentionally pinned to the patched 0.8 compatibility line (`0.8.15`). Expo SDK 57's plist parser still uses the 0.8 `DOMParser.parseFromString(xml)` API; forcing the breaking 0.9 line makes clean iOS prebuilds fail because 0.9 requires an explicit MIME type.

The remaining 19 moderate findings include Expo configuration/build tooling (`@expo/config*`, `xcode`, `uuid`) and a `decode-uri-component` advisory reached through `expo-router` → `query-string`. The router chain may be present at runtime, so it must not be described as build-tool-only. npm's suggested automatic fixes would downgrade Expo 57 to Expo 46 or otherwise replace SDK-compatible packages; do not use `npm audit fix --force`. Reassess the router advisory when a compatible Expo Router or transitive patch is available.

Recheck this document whenever Expo 57 receives another patch or before upgrading the Expo SDK. Any override change must pass Expo Doctor, TypeScript, Android export and an EAS native build.

## Public-source and build-upload audit — 1 October 2026

Gitleaks 8.30.1 (official release archive verified against its published SHA-256 checksum) found no secrets in all reachable local Git history for Siphon (102 scanned commits) or SiphonAPI (74 scanned commits), or in Siphon's EAS production upload inputs before and after cleanup. This is a pattern-based audit of the locally available history and files, not a guarantee about every possible credential or remote-only/deleted reference. No secret rotation or Git history rewrite was indicated by these results.

Public configuration is intentional: the EAS project ID/update URL, package name, AdMob application/ad-unit IDs, public signing-certificate fingerprints, developer name, and support email are identifiers, not authentication credentials. `eas.json` contains only build/submit settings and the public monetization flag. Workflows reference GitHub's `EXPO_TOKEN` secret without storing its value. Signing private keys and the Play service-account JSON belong in EAS credentials; Expo tokens belong in GitHub Actions secrets. `EXPO_PUBLIC_*` values must never contain secrets because they are embedded in the app.

The inspected EAS source copy initially contained 259 files totaling 30,904,839 bytes, including a shallow Git snapshot and release/store material. `.easignore` reduced it to 190 files totaling 4,605,846 bytes (about 85% smaller, uncompressed) and removed Git metadata, workflows, docs, store listings/screenshots/artwork, tests, and local scripts. Required app source, assets, native plugins, public contact configuration, package lockfile, and build configuration were verified present. These are upload-input sizes, not APK/AAB size reductions; source uploads and installed app contents are different.

`.gitignore` and `.easignore` also exclude environment files, common private-key/keystore formats, credential directories, common service-account key filenames, local registry credentials, and generated binaries. The public `.env.example` remains tracked but is excluded from EAS uploads. Ignore rules prevent accidental additions; they do not remove files already tracked or protect arbitrarily named JSON keys. Keep downloaded service-account keys outside the checkout.

All runtime and store assets remain tracked in GitHub. No asset was deleted or untracked; `/assets/store` and `/store` are excluded only from the cloud build upload. A clean dependency installation, Expo native-config introspection (package unchanged, target SDK 36, monetization false), TypeScript, and Android export all passed from the reduced temporary archive. The exported Android bundle hash matches the previous full-checkout export.
