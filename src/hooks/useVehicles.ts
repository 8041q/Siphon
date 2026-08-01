import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  VEHICLE_FUEL_KEYS,
  parseDecimal,
  inRange,
  CONSUMPTION_MIN,
  CONSUMPTION_MAX,
  capacityRange,
  NAME_MAX_LENGTH,
} from '../utils/vehicles';
import type { Vehicle, VehicleFuel } from '../utils/vehicles';

const STORAGE_KEY = 'siphon:vehicles';

// Electric fuels kept a default range of 350 km when migrated without one.
const DEFAULT_EV_RANGE_KM = 350;

function sanitizeFuels(raw: unknown, legacyFuelType?: unknown, legacyConsumption?: unknown, legacyTankSize?: unknown): VehicleFuel[] | null {
  const list: { fuelType: unknown; consumption: unknown; capacity: unknown }[] = [];
  if (Array.isArray(raw)) {
    for (const f of raw) {
      if (!f || typeof f !== 'object') continue;
      list.push(f as { fuelType: unknown; consumption: unknown; capacity: unknown });
    }
  } else if (legacyFuelType !== undefined || legacyConsumption !== undefined) {
    list.push({ fuelType: legacyFuelType, consumption: legacyConsumption, capacity: legacyTankSize });
  }
  if (list.length === 0) return null;

  const seen = new Set<string>();
  const fuels: VehicleFuel[] = [];
  for (const f of list) {
    if (typeof f.fuelType !== 'string' || !VEHICLE_FUEL_KEYS.includes(f.fuelType as (typeof VEHICLE_FUEL_KEYS)[number])) continue;
    if (seen.has(f.fuelType)) continue;
    const consumption = parseDecimal(String(f.consumption));
    if (consumption === null || !inRange(consumption, CONSUMPTION_MIN, CONSUMPTION_MAX)) continue;
    const range = capacityRange(f.fuelType);
    let capacity: number | null;
    if (f.capacity !== undefined && f.capacity !== null && f.capacity !== '') {
      capacity = parseDecimal(String(f.capacity));
    } else {
      capacity = null;
    }
    if (capacity === null || !inRange(capacity, range.min, range.max)) {
      // Legacy data has no per-fuel capacity: inherit the vehicle tank size
      // for liquid fuels, or fall back to a typical EV range.
      const legacy = legacyTankSize !== undefined ? parseDecimal(String(legacyTankSize)) : null;
      capacity = f.fuelType === 'electric' ? DEFAULT_EV_RANGE_KM : legacy;
    }
    if (capacity === null || !inRange(capacity, range.min, range.max)) continue;
    seen.add(f.fuelType);
    fuels.push({ fuelType: f.fuelType, consumption, capacity });
  }
  return fuels.length > 0 ? fuels : null;
}

function sanitizeVehicles(raw: unknown): Vehicle[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: Vehicle[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const v = entry as Record<string, unknown>;
    if (typeof v.id !== 'string' || !v.id || seen.has(v.id)) continue;
    if (typeof v.name !== 'string' || v.name.trim().length === 0 || v.name.length > NAME_MAX_LENGTH) continue;
    const fuels = sanitizeFuels(v.fuels, v.fuelType, v.consumption, v.tankSize);
    if (!fuels) continue;
    seen.add(v.id);
    result.push({
      id: v.id,
      name: v.name.trim(),
      fuels,
    });
  }
  return result;
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) {
          try {
            setVehicles(sanitizeVehicles(JSON.parse(val)));
          } catch {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: Vehicle[]) => {
    setVehicles(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addVehicle = useCallback(
    (v: Omit<Vehicle, 'id'>) => {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      persist([...vehicles, { ...v, id }]);
    },
    [vehicles, persist]
  );

  const updateVehicle = useCallback(
    (updated: Vehicle) => {
      persist(vehicles.map((v) => (v.id === updated.id ? updated : v)));
    },
    [vehicles, persist]
  );

  const removeVehicle = useCallback(
    (id: string) => {
      persist(vehicles.filter((v) => v.id !== id));
    },
    [vehicles, persist]
  );

  return { vehicles, addVehicle, updateVehicle, removeVehicle, loaded };
}
