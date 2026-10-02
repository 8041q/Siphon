import { useEffect, useState } from 'react';

import { client, useUI, useSecondaryDataUpdates } from './useApp';

export type { PriceHistoryPoint } from '../api/siphonClient';
import type { PriceHistoryPoint } from '../api/siphonClient';

export function usePriceHistory(stationId: string, fuelType: string) {
  const { historyEnabled } = useUI();
  const { historyDataVersion } = useSecondaryDataUpdates();
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
  }, [stationId, fuelType, historyEnabled, historyDataVersion]);

  return { data, loading, enabled: historyEnabled };
}
