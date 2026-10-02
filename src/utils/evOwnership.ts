import type { EvConfig } from './vehicles';

export type ScenarioExtras = {
  ownershipYears: number;
  evConsumption: number;
  iceConsumption: number;
  evMaintenanceYear: number;
  iceMaintenanceYear: number;
  resaleEv: number;
  resaleIce: number;
  batteryReplacementCost: number;
};

export const DEFAULT_OWNERSHIP_SCENARIO: ScenarioExtras = {
  ownershipYears: 8,
  evConsumption: 17,
  iceConsumption: 6.5,
  evMaintenanceYear: 0,
  iceMaintenanceYear: 0,
  resaleEv: 0,
  resaleIce: 0,
  batteryReplacementCost: 0,
};

// Older saved scenarios included an unused battery cost even when disabled.
export function restoreOwnershipScenario(raw: unknown): ScenarioExtras {
  const restored = { ...DEFAULT_OWNERSHIP_SCENARIO };
  if (!raw || typeof raw !== 'object') return restored;
  const saved = raw as Record<string, unknown>;
  for (const key of Object.keys(restored) as (keyof ScenarioExtras)[]) {
    const value = saved[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      restored[key] = value;
    }
  }
  if (saved.batteryReplacementEnabled === false) restored.batteryReplacementCost = 0;
  return restored;
}

export function ownershipResult(config: EvConfig, extras: ScenarioExtras) {
  const annualKm = Math.max(0, config.annualKm);
  const evEnergyYear = (annualKm / 100) * extras.evConsumption * config.electricityRate;
  const iceEnergyYear = (annualKm / 100) * extras.iceConsumption * config.gasPrice;
  const evAnnual = evEnergyYear + extras.evMaintenanceYear;
  const iceAnnual = iceEnergyYear + extras.iceMaintenanceYear;
  const years = Math.max(1, Math.round(extras.ownershipYears));
  const battery = extras.batteryReplacementCost;
  const evTotal = config.evPrice + evAnnual * years + battery - extras.resaleEv;
  const iceTotal = config.petrolPrice + iceAnnual * years - extras.resaleIce;
  const annualSavings = iceAnnual - evAnnual;
  const purchaseGap = config.evPrice - config.petrolPrice;
  const breakEvenYear = annualSavings > 0
    ? Math.max(0, Math.ceil((purchaseGap + battery) / annualSavings))
    : null;
  const perKmEv = annualKm > 0 ? evAnnual / annualKm : 0;
  const perKmIce = annualKm > 0 ? iceAnnual / annualKm : 0;
  const variableSavingPerKm = (extras.iceConsumption / 100) * config.gasPrice - (extras.evConsumption / 100) * config.electricityRate;
  const maintenanceSaving = extras.iceMaintenanceYear - extras.evMaintenanceYear;
  const ownershipFixedGapPerYear = years > 0 ? (purchaseGap + battery - extras.resaleEv + extras.resaleIce) / years : 0;
  const breakEvenAnnualKm = variableSavingPerKm > 0
    ? Math.max(0, (ownershipFixedGapPerYear - maintenanceSaving) / variableSavingPerKm)
    : null;
  const electricityBreakEven = extras.evConsumption > 0
    ? Math.max(0, (((extras.iceConsumption / 100) * config.gasPrice) + maintenanceSaving / Math.max(1, annualKm)) * 100 / extras.evConsumption)
    : null;
  return { years, evEnergyYear, iceEnergyYear, evAnnual, iceAnnual, evTotal, iceTotal, annualSavings, breakEvenYear, perKmEv, perKmIce, breakEvenAnnualKm, electricityBreakEven };
}

