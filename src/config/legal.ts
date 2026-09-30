export const PRIVACY_POLICY_URL = 'https://8041q.github.io/Siphon/privacy/';
export const SOURCE_REPOSITORY_URL = 'https://github.com/8041q/Siphon';
export const ISSUES_URL = `${SOURCE_REPOSITORY_URL}/issues`;
export const SIPHON_API_URL = 'https://github.com/8041q/SiphonAPI';
export const DGEG_URL = 'https://precoscombustiveis.dgeg.gov.pt/';
export const OPENSTREETMAP_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
export const OPENFREEMAP_URL = 'https://openfreemap.org/';
export const OSRM_URL = 'https://project-osrm.org/';

const configuredSupportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';

export const SUPPORT_EMAIL = configuredSupportEmail;
export const SUPPORT_EMAIL_CONFIGURED = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
  configuredSupportEmail,
);
