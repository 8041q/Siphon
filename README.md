Update installed app on android phone
Connect via USB and run:
```bash
npx expo run:android
```

Update apk in repo:
```bash
cd android
gradlew.bat assembleRelease
```


Troubleshoot:

Run with OpenJDK 17 (path variable needs to point to it)
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

Run again
```bash
.\gradlew assembleRelease
```