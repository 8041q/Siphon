import { useEffect, useState } from 'react';

import { hybridStore } from '../store/hybridStore';

interface SnapshotEntry {
  id: string;
  brand: string | null;
  fuels: Record<string, number>;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export function usePriceHistory(stationId: string, fuelType: string) {
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const keys = await hybridStore.listKeys?.('siphon:snapshot:') ?? [];
        const points: PriceHistoryPoint[] = [];

        for (const key of keys) {
          const raw = await hybridStore.getItem(key);
          if (!raw) continue;
          const date = key.split(':').pop()!;
          const entries: SnapshotEntry[] = JSON.parse(raw);
          const entry = entries.find((e) => e.id === stationId);
          if (entry && fuelType in entry.fuels) {
            points.push({ date, price: entry.fuels[fuelType] });
          }
        }

        points.sort((a, b) => a.date.localeCompare(b.date));

        if (!cancelled) setData(points);
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [stationId, fuelType]);

  return { data, loading };
}
