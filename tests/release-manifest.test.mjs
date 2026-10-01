import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { applyReleaseManifest } = require('../plugins/withReleaseManifest.js');

const locationService = 'expo.modules.location.services.LocationTaskService';
const adsProvider = 'com.google.android.gms.ads.MobileAdsInitProvider';
const adsService = 'com.google.android.gms.ads.AdService';
const adsMetadata = 'com.google.android.gms.ads.APPLICATION_ID';

function makeManifest() {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      application: [{
        $: { 'android:name': '.MainApplication' },
        service: [{ $: { 'android:name': 'unrelated.Service' } }],
        'meta-data': [{ $: { 'android:name': adsMetadata, 'android:value': 'test-id' } }],
      }],
    },
  };
}

function entry(manifest, kind, name) {
  return manifest.manifest.application[0][kind]
    ?.find((item) => item.$['android:name'] === name);
}

test('nonmonetized manifest removes location task and ad/billing startup components', () => {
  const manifest = applyReleaseManifest(makeManifest(), false);
  for (const [kind, name] of [
    ['service', locationService],
    ['provider', adsProvider],
    ['service', adsService],
    ['meta-data', adsMetadata],
    ['meta-data', 'com.google.android.play.billingclient.version'],
  ]) {
    assert.equal(entry(manifest, kind, name)?.$['tools:node'], 'remove', name);
  }
  assert.equal(entry(manifest, 'meta-data', adsMetadata)?.$['android:value'], undefined);
  assert.equal(entry(manifest, 'service', 'unrelated.Service')?.$['tools:node'], undefined);
});

test('future monetization manifest retains ad startup components', () => {
  const manifest = applyReleaseManifest(makeManifest(), true);
  assert.equal(entry(manifest, 'service', locationService)?.$['tools:node'], 'remove');
  assert.equal(entry(manifest, 'provider', adsProvider), undefined);
  assert.equal(entry(manifest, 'service', adsService), undefined);
  assert.equal(entry(manifest, 'meta-data', adsMetadata)?.$['android:value'], 'test-id');
});
