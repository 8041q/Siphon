export interface VehicleFuel {
  fuelType: string;
  consumption: number;
  capacity: number;
}

export interface Vehicle {
  id: string;
  name: string;
  fuels: VehicleFuel[];
}

export interface EvConfig {
  evPrice: number;
  petrolPrice: number;
  annualKm: number;
  gasPrice: number;
  electricityRate: number;
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

// Fuels a car can run on — used by the vehicle picker.
export const VEHICLE_FUEL_KEYS = ['gasoline95', 'gasoline98', 'diesel', 'dieselPremium', 'lpg', 'electric'] as const;

export function isElectricFuel(fuelType: string): boolean {
  return fuelType === 'electric';
}

// LPG is sold per kg in Portugal, per liter in Spain. Cost math needs a
// per-liter price, so €/kg prices are converted using the density of LPG
// (~0.55 kg/L).
export const LPG_KG_PER_LITER = 0.55;

export function normalizeFuelPrice(fuelType: string, price: number, source?: string): number {
  if (source === 'PT' && fuelType === 'lpg') return price * LPG_KG_PER_LITER;
  return price;
}

export function consumptionUnit(fuelType: string): string {
  return isElectricFuel(fuelType) ? 'kWh/100km' : 'L/100km';
}

export function capacityUnit(fuelType: string): string {
  return isElectricFuel(fuelType) ? 'km' : 'L';
}

// ---------- Validation ----------

export const NAME_MAX_LENGTH = 30;
export const MAX_FUELS = 2;
export const CONSUMPTION_MIN = 0.1;
export const CONSUMPTION_MAX = 60;
export const TANK_MIN = 1;
export const TANK_MAX = 300;
export const RANGE_MIN = 1;
export const RANGE_MAX = 1000;

export const EV_RATE_MIN = 0.01;
export const EV_RATE_MAX = 1;
export const GAS_PRICE_MIN = 0.5;
export const GAS_PRICE_MAX = 5;
export const EV_PRICE_MIN = 1000;
export const EV_PRICE_MAX = 500000;
export const PETROL_PRICE_MIN = 1000;
export const PETROL_PRICE_MAX = 500000;
export const ANNUAL_KM_MIN = 100;
export const ANNUAL_KM_MAX = 200000;

// Fixed estimates used by the EV vs Gas comparison. Users only edit the five
// EvConfig fields; these are built in.
export const EV_CONSUMPTION_KWH_100KM = 17;
export const GAS_CONSUMPTION_L_100KM = 5.5;
export const BATTERY_REPLACEMENT_COST = 12000;
export const BATTERY_REPLACEMENT_YEAR = 13;
export const MAINTENANCE_PER_YEAR = 320;
export const BATTERY_CO2_KG = 6000;
export const GRID_CO2_KG_PER_KWH = 0.15;

export function capacityRange(fuelType: string): { min: number; max: number } {
  return isElectricFuel(fuelType) ? { min: RANGE_MIN, max: RANGE_MAX } : { min: TANK_MIN, max: TANK_MAX };
}

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

export function hasLiquidFuel(fuels: { fuelType: string }[]): boolean {
  return fuels.some((f) => !isElectricFuel(f.fuelType));
}

export function isVehicleFormValid(form: {
  name: string;
  fuels: { fuelType: string; consumption: string; capacity: string }[];
}): boolean {
  const nameOk = form.name.trim().length > 0 && form.name.trim().length <= NAME_MAX_LENGTH;
  const fuelsOk =
    form.fuels.length > 0 &&
    form.fuels.every((f) => {
      if (!VEHICLE_FUEL_KEYS.includes(f.fuelType as (typeof VEHICLE_FUEL_KEYS)[number])) return false;
      const consumption = parseDecimal(f.consumption);
      if (consumption === null || !inRange(consumption, CONSUMPTION_MIN, CONSUMPTION_MAX)) return false;
      const capacity = parseDecimal(f.capacity);
      const range = capacityRange(f.fuelType);
      return capacity !== null && inRange(capacity, range.min, range.max);
    });
  return nameOk && fuelsOk;
}

// ---------- Cost math ----------

export function roundTripFuelCostKm(distanceKm: number, consumption: number, pricePerLiter: number): number {
  return ((distanceKm * 2) / 100) * consumption * pricePerLiter;
}

export function co2PerTank(capacity: number, fuelType: string): number {
  return capacity * co2PerLiter(fuelType);
}

export function savingPerTank(priceDiffPerLiter: number, capacity: number): number {
  return priceDiffPerLiter * capacity;
}

export interface EvBreakevenResult {
  evRunningPerYear: number;
  petrolRunningPerYear: number;
  maintenancePerYear: number;
  batteryEndOfServiceYear: number;
  evTotal: (year: number) => number;
  petrolTotal: (year: number) => number;
  breakEvenYear: number | null;
  annualGasCo2: number;
  annualEvCo2: number;
  batteryCo2: number;
}

export function evBreakeven(cfg: EvConfig): EvBreakevenResult {
  const evRunningPerYear = (cfg.annualKm / 100) * EV_CONSUMPTION_KWH_100KM * cfg.electricityRate;
  const petrolRunningPerYear = (cfg.annualKm / 100) * GAS_CONSUMPTION_L_100KM * cfg.gasPrice;
  const maintenancePerYear = MAINTENANCE_PER_YEAR;
  const batteryEndOfServiceYear = BATTERY_REPLACEMENT_YEAR;
  const evTotal = (year: number) =>
    cfg.evPrice +
    (evRunningPerYear + maintenancePerYear) * year +
    (year >= batteryEndOfServiceYear ? BATTERY_REPLACEMENT_COST : 0);
  const petrolTotal = (year: number) => cfg.petrolPrice + (petrolRunningPerYear + maintenancePerYear) * year;
  let breakEvenYear: number | null = null;
  // The battery lump cost briefly makes the EV costlier, so "worth it" is the
  // year its total drops below the petrol car's for good, after the battery is
  // paid.
  for (let y = batteryEndOfServiceYear; y <= 40; y++) {
    if (evTotal(y) <= petrolTotal(y)) {
      breakEvenYear = y;
      break;
    }
  }
  const annualGasCo2 = (cfg.annualKm / 100) * GAS_CONSUMPTION_L_100KM * co2PerLiter('gasoline95');
  const annualEvCo2 = (cfg.annualKm / 100) * EV_CONSUMPTION_KWH_100KM * GRID_CO2_KG_PER_KWH;
  return {
    evRunningPerYear,
    petrolRunningPerYear,
    maintenancePerYear,
    batteryEndOfServiceYear,
    evTotal,
    petrolTotal,
    breakEvenYear,
    annualGasCo2,
    annualEvCo2,
    batteryCo2: BATTERY_CO2_KG,
  };
}

export const DEFAULT_EV_CONFIG: EvConfig = {
  evPrice: 40000,
  petrolPrice: 35000,
  annualKm: 15000,
  gasPrice: 1.6,
  electricityRate: 0.15,
};
