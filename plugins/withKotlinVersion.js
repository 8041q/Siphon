const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withKotlinVersion(config, { kotlinVersion = '2.3.0' } = {}) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withKotlinVersion expected a Groovy build.gradle file');
    }

    const original = "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')";
    const pinned = `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}')`;

    if (config.modResults.contents.includes(pinned)) {
      // Already patched (e.g. plugin ran twice) — nothing to do.
      return config;
    }

    if (!config.modResults.contents.includes(original)) {
      throw new Error(
        'withKotlinVersion: could not find the expected kotlin-gradle-plugin classpath line to patch. ' +
        'Expo may have changed its template - check android/build.gradle manually.'
      );
    }

    config.modResults.contents = config.modResults.contents.replace(original, pinned);
    return config;
  });
};