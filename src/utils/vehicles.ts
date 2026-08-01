export interface Vehicle {
  id: string;
  name: string;
  fuelType: string;
  consumption: number;
  tankSize: number;
}

export interface EvConfig {
  electricityRate: number;
  evConsumption: number;
  gasConsumption: number;
  gasPrice: number;
  evPremium: number;
  annualKm: number;
}

// Rough well-to-wheel kg of CO2 per liter of fuel burned.
const CO2_KG_PER_LITER: Record<string, number> = {
  gasoline95: 2.39,
  gasoline95Plus: 2.39,
  gasoline95Premium: 2.39,
  gasoline98: 2.36,
  gasoline98Plus: 2.36,
  diesel: 2.68,
  dieselPremium: 2.68,
  dieselAgri: 2.68,
  dieselB: 2.68,
  dieselRenewable: 0.7,
  dieselHeating: 2.68,
  bioDiesel: 1.0,
  lpg: 1.55,
  gasolineMix: 2.3,
};

const DEFAULT_CO2 = 2.5;

export function co2PerLiter(fuelType: string): number {
  return CO2_KG_PER_LITER[fuelType] ?? DEFAULT_CO2;
}

// Liquid fuels a car can realistically run on — used by the vehicle picker.
export const VEHICLE_FUEL_KEYS = ['gasoline95', 'gasoline98', 'diesel', 'dieselPremium', 'lpg'] as const;

// ---------- Validation ----------

export const NAME_MAX_LENGTH = 30;
export const CONSUMPTION_MIN = 0.1;
export const CONSUMPTION_MAX = 60;
export const TANK_MIN = 1;
export const TANK_MAX = 300;

export const EV_RATE_MIN = 0.01;
export const EV_RATE_MAX = 1;
export const EV_CONSUMPTION_MIN = 1;
export const EV_CONSUMPTION_MAX = 60;
export const GAS_CONSUMPTION_MIN = 1;
export const GAS_CONSUMPTION_MAX = 40;
export const GAS_PRICE_MIN = 0.5;
export const GAS_PRICE_MAX = 5;
export const EV_PREMIUM_MIN = 0;
export const EV_PREMIUM_MAX = 200000;
export const ANNUAL_KM_MIN = 100;
export const ANNUAL_KM_MAX = 200000;

// Accepts dot decimals only ("5.5", "55.5"). Commas are rejected. Returns null for empty or non-numeric.
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, '');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function inRange(n: number, min: number, max: number): boolean {
  return n >= min && n <= max;
}

export function isVehicleFormValid(form: {
  name: string;
  fuelType: string;
  consumption: string;
  tankSize: string;
}): boolean {
  const nameOk = form.name.trim().length > 0 && form.name.trim().length <= NAME_MAX_LENGTH;
  const consumption = parseDecimal(form.consumption);
  const tankSize = parseDecimal(form.tankSize);
  return (
    nameOk &&
    VEHICLE_FUEL_KEYS.includes(form.fuelType as (typeof VEHICLE_FUEL_KEYS)[number]) &&
    consumption !== null &&
    inRange(consumption, CONSUMPTION_MIN, CONSUMPTION_MAX) &&
    tankSize !== null &&
    inRange(tankSize, TANK_MIN, TANK_MAX)
  );
}

// ---------- Cost math ----------

export function roundTripFuelCostKm(distanceKm: number, consumption: number, pricePerLiter: number): number {
  return ((distanceKm * 2) / 100) * consumption * pricePerLiter;
}

export function co2PerTank(tankSize: number, fuelType: string): number {
  return tankSize * co2PerLiter(fuelType);
}

export function savingPerTank(priceDiffPerLiter: number, tankSize: number): number {
  return priceDiffPerLiter * tankSize;
}

export interface EvBreakevenResult {
  annualGasCost: number;
  annualEvCost: number;
  annualSaving: number;
  breakEvenYears: number | null;
}

export function evBreakeven(cfg: EvConfig): EvBreakevenResult {
  const annualGasCost = (cfg.annualKm / 100) * cfg.gasConsumption * cfg.gasPrice;
  const annualEvCost = (cfg.annualKm / 100) * cfg.evConsumption * cfg.electricityRate;
  const annualSaving = annualGasCost - annualEvCost;
  const breakEvenYears = annualSaving > 0 ? cfg.evPremium / annualSaving : null;
  return { annualGasCost, annualEvCost, annualSaving, breakEvenYears };
}

export const DEFAULT_EV_CONFIG: EvConfig = {
  electricityRate: 0.15,
  evConsumption: 15,
  gasConsumption: 5.5,
  gasPrice: 1.6,
  evPremium: 10000,
  annualKm: 15000,
};
