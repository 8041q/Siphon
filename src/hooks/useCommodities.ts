import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { client } from './useApp';

import type { CommodityDashboard, RootManifest } from '../api/siphonClient';

function tryParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function useCommodities() {
  const [dashboard, setDashboard] = useState<CommodityDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cached = tryParse<CommodityDashboard>(
        await AsyncStorage.getItem('siphon:data:commodities:dashboard')
      );
      if (cached) {
        setDashboard(cached);
      }
      const root = tryParse<RootManifest>(
        await AsyncStorage.getItem('siphon:manifest:root')
      );
      const updated = await client.checkCommodityUpdates(root);
      if (updated) setDashboard(updated);
    } catch {
      // leave whatever was set
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { dashboard, loading, reload: load };
}