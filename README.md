
Setup

```bash
npm install
npx expo install --check
npx expo install --fix
```
Prepare and run dev
```bash
npx expo prebuild --clean --platform ios // npx expo prebuild --clean  --platform ios
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
