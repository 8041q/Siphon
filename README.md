
Setup

```bash
npm install
npx expo install --check
npx expo install --fix
```
Prepare and run dev
```bash
npx expo prebuild --clean --platform android // npx expo prebuild --clean --platform ios
cd android
.\gradlew assembleRelease
npx expo run:android // npx expo run:ios
```

If android device already has apk installed, just connect via USB and run:
Connect via USB and run (USB debugging enabled):
```bash
npx expo run:android // npx expo run:ios
```

If you want to update the apk in the repo, just run:
```bash
npx expo prebuild --clean --platform ios // npx expo prebuild --clean 
.\gradlew assembleRelease
```



\\\\\\\\\\\\\\\\\\\\\\\ SECTION UNDER REVIEW \\\\\\\\\\\\\\\\\\\\\\\\\\\
Troubleshoot:

I don´t know why, but on one device I used JDK 22 and worked, but on another I needed to install OpenJDK 17 (path variable needs to point to it)...
You can set with:
```bash
$env:JAVA_HOME="C:\Program Files\Java\jdk-17"
```
and then run build

If build fails, to clean run:
```bash
.\gradlew clean
Remove-Item -Recurse -Force .cxx
```

and Run again
```bash
.\gradlew assembleRelease
```

Make sure CMAKE in Android Studio is the latest version in SKD Tools


Logic:

The only network call is checkForUpdates(), which runs once on app launch:
It's a conditional GET with If-None-Match (ETag)
If nothing changed, the server returns 304 Not Modified with no body It returns a list of which countries changed

"Search this area" button is a 100% local cache read

When data actually changes (server-side hashes differ), syncAll re-downloads only the changed tiles (always only on app launch)

## iOS / Android

Overview: Expo SDK 57 app for finding fuel station prices in Spain/Portugal. Uses MapLibre GL maps, Expo Router, NativeWind, offline-first caching via AsyncStorage + expo-file-system.

This is a **React Native + Expo** app. The shared TypeScript code in `src/` and `app/` runs on both platforms as-is — you write it once, and React Native renders native iOS (`UIView`) or Android (`ViewGroup`) under the hood. There is no `Platform.OS` branching or separate files for each platform.

**You only touch platform-specific files for native config:**

- **iOS** (`ios/` — Xcode project, `Info.plist`, `Podfile`, `AppDelegate.swift`.
- **Android** (`android/` — configured declaratively in `app.json` under `expo.android`.
- **Styling** is fully shared via NativeWind (Tailwind CSS for RN) with a single `tailwind.config.js`.

For day-to-day features and UI changes, everything lives in shared code. No double work.

### Features:

Offline-first sync with ETag-based conditional requests (siphonClient.ts)
Hybrid storage — small keys in AsyncStorage, large tile data/snapshots on filesystem (hybridStore.ts)
Hash-comparison tile fetching skips unchanged tiles at zero network cost
3×3 grid-key lookup for Spain tiles handles boundary edge cases
New Architecture enabled (newArchEnabled: true, RCTNewArchEnabled → true in Info.plist)
No div/span usage — all UI uses React Native components ✅ (per system-prompt.txt rules)
GPS Usage: Location is detected only once when you request it (either on startup or by tapping 'My Location'). So as to not use up battery life. (won't keep update your location as you walk)