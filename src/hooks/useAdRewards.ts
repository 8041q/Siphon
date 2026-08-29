import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PaletteId } from '../theme/palettes';

const STORAGE_KEY = 'siphon:adRewards';

export type RewardItem = { id: string; requiredWatches: number };

export const PALETTE_REWARDS: RewardItem[] = [
  { id: 'midnight', requiredWatches: 3 },
  { id: 'sunset', requiredWatches: 6 },
  { id: 'forest', requiredWatches: 10 },
  { id: 'mono', requiredWatches: 15 },
];

export const ICON_REWARDS: RewardItem[] = [
  { id: 'material', requiredWatches: 3 },
  { id: 'fontawesome', requiredWatches: 10 },
  { id: 'custom-svg', requiredWatches: 15 },
];

export const STYLE_REWARDS: RewardItem[] = [
  { id: 'dotted', requiredWatches: 4 },
  { id: 'retro', requiredWatches: 4 },
  { id: 'liquid-glass', requiredWatches: 10 },
];

export function rewardForId(id: string): RewardItem | undefined {
  return [...PALETTE_REWARDS, ...ICON_REWARDS, ...STYLE_REWARDS].find((r) => r.id === id);
}

export function rewardForPalette(id: PaletteId): RewardItem | undefined {
  return PALETTE_REWARDS.find((r) => r.id === id);
}

export function rewardForIcon(id: string): RewardItem | undefined {
  return ICON_REWARDS.find((r) => r.id === id);
}

export function rewardForStyle(id: string): RewardItem | undefined {
  return STYLE_REWARDS.find((r) => r.id === id);
}

type AdRewardsState = {
  watchedCount: number;
  unlocked: string[];
};

const EMPTY: AdRewardsState = { watchedCount: 0, unlocked: [] };

function nextReward(watchedCount: number): RewardItem | undefined {
  return [...PALETTE_REWARDS, ...ICON_REWARDS, ...STYLE_REWARDS]
    .filter((r) => r.requiredWatches > watchedCount)
    .sort((a, b) => a.requiredWatches - b.requiredWatches)[0];
}

export function useAdRewards() {
  const [state, setState] = useState<AdRewardsState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val) as AdRewardsState;
            const watchedCount = Math.max(0, Number(parsed.watchedCount) || 0);
            // const unlocked = Array.isArray(parsed.unlocked) ? parsed.unlocked : [];
            const unlocked = [...PALETTE_REWARDS, ...ICON_REWARDS, ...STYLE_REWARDS].map((r) => r.id);
            setState({ watchedCount, unlocked });
          } catch {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const isUnlocked = useCallback(
    (id: string) => {
      const reward = rewardForId(id);
      if (!reward) return true;
      if (reward.requiredWatches === 0) return true;
      return state.unlocked.includes(id);
    },
    [state.unlocked],
  );

  const recordWatch = useCallback(() => {
    setState((prev) => {
      const watchedCount = prev.watchedCount + 1;
      const unlocked = [...prev.unlocked];
      for (const reward of [...PALETTE_REWARDS, ...ICON_REWARDS, ...STYLE_REWARDS]) {
        if (reward.requiredWatches <= watchedCount && !unlocked.includes(reward.id)) {
          unlocked.push(reward.id);
        }
      }
      const next: AdRewardsState = { watchedCount, unlocked };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const unlock = useCallback((id: string) => {
    setState((prev) => {
      if (prev.unlocked.includes(id)) return prev;
      const next: AdRewardsState = {
        watchedCount: prev.watchedCount,
        unlocked: [...prev.unlocked, id],
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const progress = nextReward(state.watchedCount);

  return {
    watchedCount: state.watchedCount,
    unlocked: state.unlocked,
    loaded,
    isUnlocked,
    recordWatch,
    unlock,
    nextReward: progress,
  };
}
