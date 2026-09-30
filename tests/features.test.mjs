import assert from 'node:assert/strict';
import test from 'node:test';

import { appearanceUnlocked, monetizationEnabledFrom } from '../src/config/features.ts';

test('monetization is opt-in and disabled for missing or false values', () => {
  assert.equal(monetizationEnabledFrom(undefined), false);
  assert.equal(monetizationEnabledFrom(''), false);
  assert.equal(monetizationEnabledFrom('false'), false);
  assert.equal(monetizationEnabledFrom('1'), false);
});

test('monetization accepts only an explicit true value', () => {
  assert.equal(monetizationEnabledFrom('true'), true);
  assert.equal(monetizationEnabledFrom(' TRUE '), true);
});

test('all appearance options are unlocked while monetization is disabled', () => {
  assert.equal(appearanceUnlocked(false, false), true);
  assert.equal(appearanceUnlocked(false, true), true);
});

test('earned reward state applies when monetization is enabled', () => {
  assert.equal(appearanceUnlocked(true, false), false);
  assert.equal(appearanceUnlocked(true, true), true);
});
