const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const LOCATION_TASK_SERVICE = 'expo.modules.location.services.LocationTaskService';
const ADS_PROVIDER = 'com.google.android.gms.ads.MobileAdsInitProvider';
const ADS_SERVICE = 'com.google.android.gms.ads.AdService';
const MONETIZATION_METADATA = [
  'com.google.android.gms.ads.APPLICATION_ID',
  'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT',
  'com.google.android.gms.ads.flag.OPTIMIZE_INITIALIZATION',
  'com.google.android.gms.ads.flag.OPTIMIZE_AD_LOADING',
  'com.google.android.play.billingclient.version',
];

function markForRemoval(application, kind, name) {
  const items = application[kind] ?? [];
  const replacement = { $: { 'android:name': name, 'tools:node': 'remove' } };
  const index = items.findIndex((item) => item.$?.['android:name'] === name);
  if (index >= 0) items[index] = replacement;
  else items.push(replacement);
  application[kind] = items;
}

function applyReleaseManifest(manifest, monetizationEnabled) {
  AndroidConfig.Manifest.ensureToolsAvailable(manifest);
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

  // Siphon uses getCurrentPositionAsync, never expo-location's continuous task service.
  markForRemoval(application, 'service', LOCATION_TASK_SERVICE);

  if (!monetizationEnabled) {
    // Keep the SDK source for a future licensed build, but do not start it in this one.
    markForRemoval(application, 'provider', ADS_PROVIDER);
    markForRemoval(application, 'service', ADS_SERVICE);
    for (const name of MONETIZATION_METADATA) markForRemoval(application, 'meta-data', name);
  }

  return manifest;
}

function withReleaseManifest(config) {
  const monetizationEnabled = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED === 'true';
  return withAndroidManifest(config, (config) => {
    config.modResults = applyReleaseManifest(config.modResults, monetizationEnabled);
    return config;
  });
}

module.exports = withReleaseManifest;
module.exports.applyReleaseManifest = applyReleaseManifest;
