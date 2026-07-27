
Setup

```bash
npm install expo@~54.0.0 react@19.1.0 react-native@0.81.0

npx expo install react-dom@19.1.0 @react-native-async-storage/async-storage expo-dev-client expo-file-system expo-location expo-system-ui react-native-safe-area-context @expo/ui @types/react typescript

npx expo install --fix
```

Update apk in repo:
```bash
npx expo prebuild --platform android

cd android
gradlew.bat assembleRelease
```

Update installed app on android phone
Connect via USB and run:
```bash
npx expo run:android
```

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

