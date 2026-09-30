import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('EXPO_PUBLIC_SUPPORT_EMAIL must be set to the public Siphon support mailbox');
  process.exit(1);
}

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const template = await readFile('docs/privacy/index.template.html', 'utf8');
const output = template.replaceAll('{{SUPPORT_EMAIL}}', escapeHtml(email));
const destination = resolve(process.argv[2] ?? 'dist/privacy-site');

await mkdir(resolve(destination, 'privacy'), { recursive: true });
await writeFile(resolve(destination, 'privacy/index.html'), output);
await writeFile(
  resolve(destination, 'index.html'),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./privacy/"><title>Siphon</title>',
);

console.log(`Built privacy site at ${destination}`);
