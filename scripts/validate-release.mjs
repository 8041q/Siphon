import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const appJson = JSON.parse(await readFile(new URL('app.json', root), 'utf8'));
const releaseContact = JSON.parse(await readFile(new URL('release-contact.json', root), 'utf8'));
const args = process.argv.slice(2);

const release = args.includes('--release');
const tagIndex = args.indexOf('--tag');
const tag = tagIndex >= 0 ? args[tagIndex + 1] : undefined;
const semver = /^\d+\.\d+\.\d+$/;
const errors = [];

if (!semver.test(packageJson.version)) errors.push(`package.json version is not X.Y.Z: ${packageJson.version}`);
if (!semver.test(appJson.expo?.version)) errors.push(`app.json expo.version is not X.Y.Z: ${appJson.expo?.version}`);
if (packageJson.version !== appJson.expo?.version) {
  errors.push(`package.json (${packageJson.version}) and app.json (${appJson.expo?.version}) versions differ`);
}
if (appJson.expo?.android?.package !== 'com.ctr_8041q.siphon') {
  errors.push('Android package must remain com.ctr_8041q.siphon');
}
if (appJson.expo?.owner !== 'ctr_8041q' || appJson.expo?.slug !== 'siphon') {
  errors.push('EAS owner and slug must remain @ctr_8041q/siphon');
}
const easProjectId = appJson.expo?.extra?.eas?.projectId;
if (easProjectId !== 'cdd86590-0b96-4279-a80a-a6c0c2a51707' ||
    appJson.expo?.updates?.url !== `https://u.expo.dev/${easProjectId}`) {
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
