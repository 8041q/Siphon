import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_EV_CONFIG } from '../utils/vehicles';
import type { EvConfig } from '../utils/vehicles';

const STORAGE_KEY = 'siphon:evConfig';

const NUMERIC_FIELDS = [
  'evPrice',
  'petrolPrice',
  'annualKm',
  'gasPrice',
  'electricityRate',
] as const;

function sanitizeEvConfig(raw: unknown): EvConfig {
  const base = { ...DEFAULT_EV_CONFIG };
  if (!raw || typeof raw !== 'object') return base;
  const cfg = raw as Partial<EvConfig>;
  for (const field of NUMERIC_FIELDS) {
    const n = Number(cfg[field]);
    if (Number.isFinite(n) && n > 0) base[field] = n;
  }
  return base;
}

export function useEvConfig() {
  const [config, setConfig] = useState<EvConfig>(DEFAULT_EV_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) {
          try {
            setConfig(sanitizeEvConfig(JSON.parse(val)));
          } catch {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const setEvConfig = useCallback((next: EvConfig) => {
    setConfig(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  return { config, setEvConfig, loaded };
}
