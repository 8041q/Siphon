import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { AUTO_CHECK_UPDATES_KEY, createAppUpdatePreferences } from '../src/utils/appUpdatePreferences.ts';

function memoryStore(initial = null) {
  let value = initial;
  return {
    getItem: async (key) => {
      assert.equal(key, AUTO_CHECK_UPDATES_KEY);
      return value;
    },
    setItem: async (key, next) => {
      assert.equal(key, AUTO_CHECK_UPDATES_KEY);
      value = next;
    },
  };
}

test('startup waits for the saved opt-out before any update check', async () => {
  let resolveRead;
  let checks = 0;
  const preferences = createAppUpdatePreferences({
    getItem: () => new Promise((resolve) => { resolveRead = resolve; }),
    setItem: async () => {},
  }, () => {});
  const startup = preferences.checkOnStartup(async () => { checks += 1; });
  assert.equal(checks, 0);
  resolveRead('false');
  await startup;
  assert.equal(checks, 0);
});

test('new installs default to one check despite concurrent startup callers', async () => {
  let checks = 0;
  const preferences = createAppUpdatePreferences(memoryStore(), () => {});
  const check = async () => { checks += 1; };
  await Promise.all([preferences.checkOnStartup(check), preferences.checkOnStartup(check)]);
  await preferences.checkOnStartup(check);
  assert.equal(checks, 1);
});

test('saved changes survive relaunch and enabling waits for the next startup', async () => {
  const store = memoryStore('false');
  let checks = 0;
  const check = async () => { checks += 1; };
  const preferences = createAppUpdatePreferences(store, () => {});
  await preferences.checkOnStartup(check);
  assert.equal(await preferences.setEnabled(true), true);
  await preferences.checkOnStartup(check);
  assert.equal(checks, 0);
  await createAppUpdatePreferences(store, () => {}).checkOnStartup(check);
  assert.equal(checks, 1);
  assert.equal(await preferences.setEnabled(false), true);
  await createAppUpdatePreferences(store, () => {}).checkOnStartup(check);
  assert.equal(checks, 1);
});

test('failed persistence retains the saved preference and reports failure', async () => {
  let state;
  const preferences = createAppUpdatePreferences({
    getItem: async () => 'false',
    setItem: async () => { throw new Error('storage unavailable'); },
  }, (next) => { state = next; });
  assert.equal(await preferences.setEnabled(true), false);
  assert.deepEqual(state, {
    autoCheckEnabled: false,
    autoCheckLoaded: true,
    autoCheckSaving: false,
  });
});

test('unreadable preferences skip automatic requests', async () => {
  let checks = 0;
  const preferences = createAppUpdatePreferences({
    getItem: async () => { throw new Error('storage unavailable'); },
    setItem: async () => {},
  }, () => {});
  await preferences.checkOnStartup(async () => { checks += 1; });
  assert.equal(checks, 0);
});

test('overlapping changes are written in order and the last choice survives relaunch', async () => {
  const store = memoryStore();
  const preferences = createAppUpdatePreferences(store, () => {});
  assert.deepEqual(await Promise.all([
    preferences.setEnabled(true),
    preferences.setEnabled(false),
  ]), [true, true]);
  let checks = 0;
  await createAppUpdatePreferences(store, () => {}).checkOnStartup(async () => { checks += 1; });
  assert.equal(checks, 0);
});

// Exercise the real hook with native/network adapters, without a device or
// real requests. Each harness represents a new app process.
async function updateHookHarness(savedPreference) {
  const source = await readFile(new URL('../src/hooks/useAppUpdate.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const calls = { eas: 0, github: 0 };
  let snapshot;
  const adapters = {
    react: {
      useState: (initial) => [initial, (next) => { snapshot = next; }],
      useEffect: (effect) => { effect(); },
    },
    'react-native': { Platform: { OS: 'android' }, Linking: {} },
    'expo-application': { applicationId: 'com.ctr_8041q.siphon', nativeApplicationVersion: '1.0.0' },
    'expo-updates': {
      channel: 'production',
      isEnabled: true,
      checkForUpdateAsync: async () => {
        calls.eas += 1;
        return { isAvailable: false, isRollBackToEmbedded: false };
      },
    },
    '@react-native-async-storage/async-storage': memoryStore(savedPreference),
    '../utils/appUpdatePreferences': { createAppUpdatePreferences },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => {
      assert.ok(name in adapters, `unexpected import ${name}`);
      return adapters[name];
    },
    __DEV__: false,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async () => { calls.github += 1; return { status: 404 }; },
  });
  return {
    mount: (options) => module.exports.useAppUpdate(options),
    calls,
    snapshot: () => snapshot,
  };
}

test('disabled startup skips EAS and GitHub checks, settings is passive, manual checks still work', async () => {
  const harness = await updateHookHarness('false');
  harness.mount({ checkOnStartup: true });
  const settings = harness.mount();
  await new Promise(setImmediate);
  assert.deepEqual(harness.calls, { eas: 0, github: 0 });
  assert.equal(harness.snapshot().hasChecked, false);
  await settings.check(true);
  assert.deepEqual(harness.calls, { eas: 1, github: 1 });
  assert.equal(harness.snapshot().hasChecked, true);
});

test('enabled startup checks both services once across repeated watcher/settings mounts', async () => {
  const harness = await updateHookHarness(null);
  harness.mount({ checkOnStartup: true });
  harness.mount({ checkOnStartup: true });
  harness.mount();
  await new Promise(setImmediate);
  assert.deepEqual(harness.calls, { eas: 1, github: 1 });
});
