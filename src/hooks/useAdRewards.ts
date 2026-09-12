import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PaletteId } from '../theme/palettes';

const STORAGE_KEY = 'siphon:adRewards';

export type RewardItem = { id: string; requiredWatches: number };

export const PALETTE_REWARDS: readonly RewardItem[] = [
  { id: 'midnight', requiredWatches: 3 },
  { id: 'sunset', requiredWatches: 6 },
  { id: 'forest', requiredWatches: 10 },
  { id: 'mono', requiredWatches: 15 },
];

export const ICON_REWARDS: readonly RewardItem[] = [
  { id: 'material', requiredWatches: 3 },
  { id: 'fontawesome', requiredWatches: 10 },
  { id: 'custom-svg', requiredWatches: 15 },
];

export const STYLE_REWARDS: readonly RewardItem[] = [
  { id: 'dotted', requiredWatches: 4 },
  { id: 'retro', requiredWatches: 4 },
  { id: 'liquid-glass', requiredWatches: 10 },
];

export const REWARDS: readonly RewardItem[] = Object.freeze([
  ...PALETTE_REWARDS,
  ...ICON_REWARDS,
  ...STYLE_REWARDS,
]);

export function rewardForId(id: string): RewardItem | undefined {
  return REWARDS.find((reward) => reward.id === id);
}

export function rewardForPalette(id: PaletteId): RewardItem | undefined {
  return PALETTE_REWARDS.find((reward) => reward.id === id);
}

export function rewardForIcon(id: string): RewardItem | undefined {
  return ICON_REWARDS.find((reward) => reward.id === id);
}

export function rewardForStyle(id: string): RewardItem | undefined {
  return STYLE_REWARDS.find((reward) => reward.id === id);
}

type PersistedAdRewardsState = {
  watchedCount?: unknown;
  // Older builds also persisted an `unlocked` array. Unlocks are now derived
  // from watchedCount so corrupt/stale arrays cannot grant rewards permanently.
  unlocked?: unknown;
};

function normalizeWatchedCount(raw: unknown): number {
  const number = Number(raw);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.floor(number));
}

function serialize(watchedCount: number): string {
  // Keep an unlocked list for backwards compatibility with older app builds,
  // but treat watchedCount as the single source of truth when reading it back.
  const unlocked = REWARDS
    .filter((reward) => reward.requiredWatches <= watchedCount)
    .map((reward) => reward.id);
  return JSON.stringify({ version: 2, watchedCount, unlocked });
}

export function useAdRewards() {
  const [watchedCount, setWatchedCount] = useState(0);
  const watchedCountRef = useRef(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (cancelled || !value) return;
        try {
          const parsed = JSON.parse(value) as PersistedAdRewardsState;
          if (!cancelled) {
            const next = normalizeWatchedCount(parsed.watchedCount);
            watchedCountRef.current = next;
            setWatchedCount(next);
          }
        } catch {
          // Corrupt reward progress is treated as a fresh state.
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unlocked = useMemo(
    () => REWARDS.filter((reward) => reward.requiredWatches <= watchedCount).map((reward) => reward.id),
    [watchedCount],
  );

  const isUnlocked = useCallback(
    (id: string) => {
      const reward = rewardForId(id);
      return !reward || reward.requiredWatches <= watchedCount;
    },
    [watchedCount],
  );

  const persistCount = useCallback((nextCount: number) => {
    void AsyncStorage.setItem(STORAGE_KEY, serialize(nextCount)).catch(() => undefined);
  }, []);

  const recordWatch = useCallback((): number => {
    const next = watchedCountRef.current + 1;
    watchedCountRef.current = next;
    setWatchedCount(next);
    persistCount(next);
    return next;
  }, [persistCount]);

  // Kept for compatibility with any callers that explicitly unlock a reward.
  // Raising watchedCount to that reward's threshold also unlocks every earlier
  // reward, keeping the reward model internally consistent.
  const unlock = useCallback((id: string) => {
    const reward = rewardForId(id);
    if (!reward || watchedCountRef.current >= reward.requiredWatches) return;
    const next = reward.requiredWatches;
    watchedCountRef.current = next;
    setWatchedCount(next);
    persistCount(next);
  }, [persistCount]);

  const nextReward = useMemo(
    () => REWARDS
      .filter((reward) => reward.requiredWatches > watchedCount)
      .reduce<RewardItem | undefined>(
        (best, reward) => (!best || reward.requiredWatches < best.requiredWatches ? reward : best),
        undefined,
      ),
    [watchedCount],
  );

  return {
    watchedCount,
    unlocked,
    loaded,
    isUnlocked,
    recordWatch,
    unlock,
    nextReward,
  };
}
