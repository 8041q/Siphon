const RECORD_AUDIO = 'android.permission.RECORD_AUDIO';
const WRITE_EXTERNAL_STORAGE = 'android.permission.WRITE_EXTERNAL_STORAGE';
const SYSTEM_ALERT_WINDOW = 'android.permission.SYSTEM_ALERT_WINDOW';
const AD_ID = 'com.google.android.gms.permission.AD_ID';
const PLAY_BILLING = 'com.android.vending.BILLING';

/** @type {import('expo/config').ConfigContext['config']} */
module.exports = ({ config }) => {
  const monetizationEnabled = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED === 'true';
  const blockedPermissions = new Set(config.android?.blockedPermissions ?? []);

  blockedPermissions.add(RECORD_AUDIO);
  blockedPermissions.add(WRITE_EXTERNAL_STORAGE);
  blockedPermissions.add(SYSTEM_ALERT_WINDOW);
  if (!monetizationEnabled) {
    blockedPermissions.add(AD_ID);
    blockedPermissions.add(PLAY_BILLING);
  } else {
    blockedPermissions.delete(AD_ID);
    blockedPermissions.delete(PLAY_BILLING);
  }

  return {
    ...config,
    android: {
      ...config.android,
      blockedPermissions: [...blockedPermissions],
    },
    extra: {
      ...config.extra,
      monetizationEnabled,
      supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? '',
    },
  };
};
