import assert from 'node:assert/strict';
import test from 'node:test';

import { numericInput, syncNumericInput } from '../src/utils/numericInput.ts';
import { DEFAULT_OWNERSHIP_SCENARIO, ownershipResult, restoreOwnershipScenario } from '../src/utils/evOwnership.ts';

test('decimal entry survives numeric updates while typing, deleting, and editing', () => {
  for (const text of ['', '.', '.1', '.15', '1', '1.', '1.0', '1.05', '01.050', '0.', '0']) {
    const input = numericInput(text);
    assert.ok(input, `Accept ${text}`);
    assert.equal(syncNumericInput(input.text, input.value), text);
  }
  assert.equal(numericInput('').value, 0);
  assert.equal(numericInput('.').value, 0);
  assert.equal(numericInput('1.05').value, 1.05);
});

test('commas, duplicate dots, non-numeric text, negatives, and overflow are rejected', () => {
  for (const text of [',', '1,5', '1,000', '1..5', '1.5.0', '-2', '1e3', '5 euros', ' ', '9'.repeat(400)]) {
    assert.equal(numericInput(text), null, `Reject ${text}`);
  }
});

test('ownership years accept whole numbers and allow clearing the field', () => {
  assert.equal(numericInput('12', true).value, 12);
  assert.equal(numericInput('', true).value, 0);
  assert.equal(numericInput('1.5', true), null);
  assert.equal(numericInput('1,5', true), null);
});

test('external changes refresh inputs while parent echoes preserve unfinished decimals', () => {
  assert.equal(syncNumericInput('6.', 6), '6.');
  assert.equal(syncNumericInput('6.50', 6.5), '6.50');
  assert.equal(syncNumericInput('6.', 17), '17');
  assert.equal(syncNumericInput('', 0), '');
  assert.equal(syncNumericInput('', 8000), '8000');
});

const config = { evPrice: 30000, petrolPrice: 25000, annualKm: 10000, gasPrice: 2, electricityRate: 0.2 };
const scenario = { ...DEFAULT_OWNERSHIP_SCENARIO, evConsumption: 20, iceConsumption: 5 };

test('an omitted battery replacement costs nothing', () => {
  const result = ownershipResult(config, scenario);
  assert.equal(result.evTotal, 33200);
  assert.equal(result.iceTotal, 33000);
  assert.equal(result.breakEvenYear, 9);
});

test('battery replacement adds exactly one cost across different ownership periods', () => {
  for (const ownershipYears of [1, 8, 12]) {
    const base = ownershipResult(config, { ...scenario, ownershipYears });
    const battery = ownershipResult(config, { ...scenario, ownershipYears, batteryReplacementCost: 6000 });
    assert.equal(battery.evTotal - base.evTotal, 6000);
    assert.equal(battery.iceTotal, base.iceTotal);
    assert.equal(battery.evAnnual, base.evAnnual);
    assert.equal(battery.perKmEv, base.perKmEv);
    assert.equal(battery.breakEvenYear, 19);
    assert.ok(battery.breakEvenAnnualKm > base.breakEvenAnnualKm);
  }
});

test('battery cost survives saving and reloading, and clearing removes the cost', () => {
  const saved = restoreOwnershipScenario(JSON.parse(JSON.stringify({ ...scenario, batteryReplacementCost: 6000.5 })));
  assert.equal(saved.batteryReplacementCost, 6000.5);
  const cleared = restoreOwnershipScenario({ ...saved, batteryReplacementCost: numericInput('').value });
  assert.equal(ownershipResult(config, cleared).evTotal, ownershipResult(config, scenario).evTotal);
});

test('legacy disabled battery defaults stay excluded and invalid saved numbers use defaults', () => {
  assert.equal(restoreOwnershipScenario({ batteryReplacementEnabled: false, batteryReplacementCost: 8000 }).batteryReplacementCost, 0);
  assert.equal(restoreOwnershipScenario({ batteryReplacementEnabled: true, batteryReplacementCost: 8000 }).batteryReplacementCost, 8000);
  assert.deepEqual(restoreOwnershipScenario(null), DEFAULT_OWNERSHIP_SCENARIO);
  assert.deepEqual(restoreOwnershipScenario({ evConsumption: -1, batteryReplacementCost: 'bad', ownershipYears: Infinity }), DEFAULT_OWNERSHIP_SCENARIO);
});
