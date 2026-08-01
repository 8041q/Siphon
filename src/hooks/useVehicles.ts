import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { VEHICLE_FUEL_KEYS, parseDecimal, inRange, CONSUMPTION_MIN, CONSUMPTION_MAX, TANK_MIN, TANK_MAX, NAME_MAX_LENGTH } from '../utils/vehicles';
import type { Vehicle } from '../utils/vehicles';

const STORAGE_KEY = 'siphon:vehicles';

function sanitizeVehicles(raw: unknown): Vehicle[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: Vehicle[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const v = entry as Partial<Vehicle>;
    if (typeof v.id !== 'string' || !v.id || seen.has(v.id)) continue;
    if (typeof v.name !== 'string' || v.name.trim().length === 0 || v.name.length > NAME_MAX_LENGTH) continue;
    const fuelType = v.fuelType;
    if (typeof fuelType !== 'string' || !VEHICLE_FUEL_KEYS.includes(fuelType as (typeof VEHICLE_FUEL_KEYS)[number])) continue;
    const consumption = parseDecimal(String(v.consumption));
    const tankSize = parseDecimal(String(v.tankSize));
    if (
      consumption === null ||
      !inRange(consumption, CONSUMPTION_MIN, CONSUMPTION_MAX) ||
      tankSize === null ||
      !inRange(tankSize, TANK_MIN, TANK_MAX)
    ) {
      continue;
    }
    seen.add(v.id);
    result.push({
      id: v.id,
      name: v.name.trim(),
      fuelType,
      consumption,
      tankSize,
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
