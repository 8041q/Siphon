import { useEffect, useState } from 'react';

import { client, useApp } from './useApp';

export type { PriceHistoryPoint } from '../api/siphonClient';
import type { PriceHistoryPoint } from '../api/siphonClient';

export function usePriceHistory(stationId: string, fuelType: string) {
  const { historyEnabled } = useApp();
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const points =
          historyEnabled && stationId && fuelType
            ? await client.getPriceHistory(stationId, fuelType)
            : [];
        if (!cancelled) setData(points);
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [stationId, fuelType, historyEnabled]);

  return { data, loading, enabled: historyEnabled };
}
