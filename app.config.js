const RECORD_AUDIO = 'android.permission.RECORD_AUDIO';
const WRITE_EXTERNAL_STORAGE = 'android.permission.WRITE_EXTERNAL_STORAGE';
const SYSTEM_ALERT_WINDOW = 'android.permission.SYSTEM_ALERT_WINDOW';
const MONETIZATION_PERMISSIONS = [
  'com.google.android.gms.permission.AD_ID',
  'android.permission.ACCESS_ADSERVICES_AD_ID',
  'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
  'android.permission.ACCESS_ADSERVICES_TOPICS',
  'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
  'com.android.vending.BILLING',
];
const { supportEmail } = require('./release-contact.json');
const { version } = require('./package.json');

/** @type {import('expo/config').ConfigContext['config']} */
module.exports = ({ config }) => {
  const monetizationEnabled = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED === 'true';
  const blockedPermissions = new Set(config.android?.blockedPermissions ?? []);

  blockedPermissions.add(RECORD_AUDIO);
  blockedPermissions.add(WRITE_EXTERNAL_STORAGE);
  blockedPermissions.add(SYSTEM_ALERT_WINDOW);
  if (!monetizationEnabled) {
    for (const permission of MONETIZATION_PERMISSIONS) blockedPermissions.add(permission);
  } else {
    for (const permission of MONETIZATION_PERMISSIONS) blockedPermissions.delete(permission);
  }

  return {
    ...config,
    version,
    android: {
      ...config.android,
      blockedPermissions: [...blockedPermissions],
    },
    extra: {
      ...config.extra,
      monetizationEnabled,
      supportEmail,
    },
  };
};
