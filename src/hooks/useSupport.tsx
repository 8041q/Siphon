import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { useAdConsent } from '../hooks/useAdConsent';

import { useAdRewards, SVG_REWARDS, PALETTE_REWARDS } from './useAdRewards';
import type { RewardItem } from './useAdRewards';
import { usePalette } from './usePalette';
import { useRewardedAd } from './useRewardedAd';
import type { Palette, PaletteId } from '../theme/palettes';

export const ALL_REWARDS: RewardItem[] = [...SVG_REWARDS, ...PALETTE_REWARDS];

type WatchResult = { earned: boolean; unlockedItem: RewardItem | null };

interface SupportValue {
  watchedCount: number;
  isUnlocked: (id: string) => boolean;
  unlockedItemAfter: (count: number) => RewardItem | null;
  watchAd: () => Promise<WatchResult>;
  watchToUnlock: (targetId: string) => Promise<boolean>;
  adLoaded: boolean;
  adLoading: boolean;
  palette: Palette;
  paletteId: PaletteId;
  setPaletteId: (id: PaletteId) => void;
  paletteVariables: Record<string, string>;
}

const SupportContext = createContext<SupportValue | null>(null);

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const rewards = useAdRewards();
  const palette = usePalette();
  const rewarded = useRewardedAd();

  const unlockedItemAfter = useCallback((count: number): RewardItem | null => {
    return ALL_REWARDS.find((r) => r.requiredWatches === count) ?? null;
  }, []);

  const watchAd = useCallback(async (): Promise<WatchResult> => {
    const earned = await rewarded.watchAd();
    if (!earned) return { earned: false, unlockedItem: null };
    const before = rewards.watchedCount;
    rewards.recordWatch();
    return { earned: true, unlockedItem: unlockedItemAfter(before + 1) };
  }, [rewarded, rewards.watchedCount, rewards.recordWatch, unlockedItemAfter]);

  const watchToUnlock = useCallback(
    async (targetId: string): Promise<boolean> => {
      if (rewards.isUnlocked(targetId)) return true;
      const earned = await rewarded.watchAd();
      if (earned) rewards.recordWatch();
      return earned;
    },
    [rewards, rewarded],
  );

  const value = useMemo<SupportValue>(
    () => ({
      watchedCount: rewards.watchedCount,
      isUnlocked: rewards.isUnlocked,
      unlockedItemAfter,
      watchAd,
      watchToUnlock,
      adLoaded: rewarded.loaded,
      adLoading: rewarded.loading,
      palette: palette.palette,
      paletteId: palette.paletteId,
      setPaletteId: palette.setPaletteId,
      paletteVariables: palette.variables,
    }),
    [rewards, palette, rewarded, watchAd, watchToUnlock, unlockedItemAfter],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport(): SupportValue {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used within SupportProvider');
  return ctx;
}
