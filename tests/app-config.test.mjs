import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const configure = require('../app.config.js');
const app = require('../app.json').expo;

const monetizationPermissions = [
  'com.google.android.gms.permission.AD_ID',
  'android.permission.ACCESS_ADSERVICES_AD_ID',
  'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
  'android.permission.ACCESS_ADSERVICES_TOPICS',
  'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
  'com.android.vending.BILLING',
];

test('release config blocks ad, attribution, referrer and billing permissions', () => {
  const previous = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;
  process.env.EXPO_PUBLIC_MONETIZATION_ENABLED = 'false';
  try {
    const configured = configure({ config: app });
    for (const permission of monetizationPermissions) {
      assert.ok(configured.android.blockedPermissions.includes(permission), permission);
    }
    assert.ok(configured.android.blockedPermissions.includes('android.permission.RECORD_AUDIO'));
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;
    else process.env.EXPO_PUBLIC_MONETIZATION_ENABLED = previous;
  }
});

test('future monetization builds can restore ad and billing permissions', () => {
  const previous = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;
  process.env.EXPO_PUBLIC_MONETIZATION_ENABLED = 'true';
  try {
    const configured = configure({
      config: { ...app, android: { ...app.android, blockedPermissions: monetizationPermissions } },
    });
    for (const permission of monetizationPermissions) {
      assert.ok(!configured.android.blockedPermissions.includes(permission), permission);
    }
    assert.ok(configured.android.blockedPermissions.includes('android.permission.RECORD_AUDIO'));
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;
    else process.env.EXPO_PUBLIC_MONETIZATION_ENABLED = previous;
  }
});
