import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const languages = ['en', 'pt', 'es', 'fr', 'de'];

function leafKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = `${prefix}${key}`;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? leafKeys(child, `${path}.`)
      : [path];
  });
}

test('all supported languages expose the same translation keys', async () => {
  const resources = await Promise.all(languages.map(async (language) => {
    const body = await readFile(new URL(`../src/i18n/locales/${language}.json`, import.meta.url), 'utf8');
    return [language, new Set(leafKeys(JSON.parse(body)))];
  }));
  const english = resources[0][1];

  for (const [language, keys] of resources.slice(1)) {
    assert.deepEqual([...english].filter((key) => !keys.has(key)), [], `${language} is missing keys`);
    assert.deepEqual([...keys].filter((key) => !english.has(key)), [], `${language} has extra keys`);
  }
});
