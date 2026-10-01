import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);
const { getConfig } = require('expo/config');
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const { exp: appConfig } = getConfig(fileURLToPath(root), { skipPlugins: true });
const releaseContact = JSON.parse(await readFile(new URL('release-contact.json', root), 'utf8'));
const args = process.argv.slice(2);

const release = args.includes('--release');
const tagIndex = args.indexOf('--tag');
const tag = tagIndex >= 0 ? args[tagIndex + 1] : undefined;
const semver = /^\d+\.\d+\.\d+$/;
const errors = [];

if (!semver.test(packageJson.version)) errors.push(`package.json version is not X.Y.Z: ${packageJson.version}`);
if (!semver.test(appConfig.version)) errors.push(`Resolved Expo version is not X.Y.Z: ${appConfig.version}`);
if (packageJson.version !== appConfig.version) {
  errors.push(`package.json (${packageJson.version}) and resolved Expo config (${appConfig.version}) versions differ`);
}
if (appConfig.android?.package !== 'com.ctr_8041q.siphon') {
  errors.push('Android package must remain com.ctr_8041q.siphon');
}
if (appConfig.owner !== 'ctr_8041q' || appConfig.slug !== 'siphon') {
  errors.push('EAS owner and slug must remain @ctr_8041q/siphon');
}
const easProjectId = appConfig.extra?.eas?.projectId;
if (easProjectId !== 'cdd86590-0b96-4279-a80a-a6c0c2a51707' ||
    appConfig.updates?.url !== `https://u.expo.dev/${easProjectId}`) {
  errors.push('EAS project ID and update URL must match @ctr_8041q/siphon');
}
if (tag && tag !== `v${packageJson.version}`) {
  errors.push(`tag ${tag} must equal v${packageJson.version}`);
}
if (release) {
  const email = releaseContact.supportEmail?.trim() ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('release-contact.json must contain the public support mailbox');
  }
  if (!releaseContact.developerName?.trim()) errors.push('release-contact.json must contain the public developer name');
  if (process.env.EXPO_PUBLIC_MONETIZATION_ENABLED !== 'false') {
    errors.push('EXPO_PUBLIC_MONETIZATION_ENABLED must be explicitly false for this release');
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Validated Siphon ${packageJson.version}${tag ? ` (${tag})` : ''}`);
