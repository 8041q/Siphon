import { useCallback, useEffect, useRef, useState } from 'react';

import { client } from './useApp';
import type { CommodityDashboard } from '../api/siphonClient';

export function useCommodities() {
  const [dashboard, setDashboard] = useState<CommodityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(false);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  const load = useCallback(async () => {
    const run = ++requestSeqRef.current;
    const isActive = () => mountedRef.current && requestSeqRef.current === run;

    if (isActive()) {
      setLoading(true);
      setError(false);
    }

    try {
      // Commodity data lives under the file-backed `siphon:data:` namespace.
      // Always read it through FuelDataClient/hybridStore rather than directly
      // from AsyncStorage, otherwise a valid offline cache is invisible here.
      const cached = await client.getCachedCommodityDashboard();
      if (!isActive()) return;
      if (cached) setDashboard(cached);

      const updated = await client.refreshCommodityDashboard();
      if (!isActive()) return;
      if (updated) setDashboard(updated);
    } catch {
      if (!isActive()) return;
      setError(true);
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { dashboard, loading, error, reload: load };
}
