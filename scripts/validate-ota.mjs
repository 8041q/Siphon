import { execFileSync } from 'node:child_process';

const latestTag = execFileSync('git', ['describe', '--tags', '--abbrev=0'], { encoding: 'utf8' }).trim();
const changed = execFileSync('git', ['diff', '--name-only', `${latestTag}..HEAD`], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const nativePatterns = [
  /^app\.json$/,
  /^app\.config\.[cm]?[jt]s$/,
  /^eas\.json$/,
  /^package(?:-lock)?\.json$/,
  /^plugins\//,
  /^assets\/(?:icon(?:-dark)?|adaptive-(?:icon|monochrome)|splash-icon(?:-dark)?)\./,
];
const unsafe = changed.filter((file) => nativePatterns.some((pattern) => pattern.test(file)));

if (unsafe.length > 0) {
  console.error(`OTA blocked: native/runtime-affecting files changed since ${latestTag}:\n${unsafe.join('\n')}`);
  process.exit(1);
}

console.log(`OTA-safe diff validated against ${latestTag}`);
