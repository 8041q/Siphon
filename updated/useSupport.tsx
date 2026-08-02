import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { useAdConsent } from '../hooks/useAdConsent';

import { useAdRewards, SVG_REWARDS, PALETTE_REWARDS } from './useAdRewards';
import type { RewardItem } from './useAdRewards';
import { usePalette } from './usePalette';
import { useRewardedAd } from './useRewardedAd';
import { useUserLocationMarker, DEFAULT_MARKER } from './useUserLocationMarker';
import type { PaletteId } from '../theme/palettes';

export const ALL_REWARDS: RewardItem[] = [...SVG_REWARDS, ...PALETTE_REWARDS];

type WatchResult = { earned: boolean; unlockedItem: RewardItem | null };

interface SupportValue {
  watchedCount: number;
  isUnlocked: (id: string) => boolean;
  /** Ads still needed to unlock `id`. 0 once unlocked. */
  remainingFor: (id: string) => number;
  unlockedItemAfter: (count: number) => RewardItem | null;
  watchAd: () => Promise<WatchResult>;
  adLoaded: boolean;
  adLoading: boolean;
  /** True once persisted reward progress has been read from storage. */
  rewardsLoaded: boolean;
  paletteId: PaletteId;
  setPaletteId: (id: PaletteId) => void;
  paletteVariables: Record<string, string>;
}

const SupportContext = createContext<SupportValue | null>(null);

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const rewards = useAdRewards();
  const palette = usePalette();
  const rewarded = useRewardedAd();
  const consent = useAdConsent();
  const locationMarker = useUserLocationMarker();

  // Defense in depth: useUserLocationMarker has no concept of "locked" at
  // all, it just persists whatever it's told to. If a locked reward marker
  // ever ends up in storage - from before this fix, from a future call site
  // that forgets to check isUnlocked, from restored/edited storage, etc. -
  // fall back to the default rather than silently letting it render. Only
  // runs once both persisted reward progress and the marker have loaded.
  useEffect(() => {
    if (!rewards.loaded || !locationMarker.loaded) return;
    const { marker } = locationMarker;
    if (marker.type !== 'svg') return;
    const reward = SVG_REWARDS.find((r) => r.id === marker.value);
    if (reward && !rewards.isUnlocked(reward.id)) {
      locationMarker.setMarker(DEFAULT_MARKER);
    }
  }, [rewards.loaded, rewards.isUnlocked, locationMarker.loaded, locationMarker.marker, locationMarker.setMarker]);

  const unlockedItemAfter = useCallback((count: number): RewardItem | null => {
    return ALL_REWARDS.find((r) => r.requiredWatches === count) ?? null;
  }, []);

  const remainingFor = useCallback(
    (id: string) => {
      const reward = ALL_REWARDS.find((r) => r.id === id);
      if (!reward) return 0;
      return Math.max(0, reward.requiredWatches - rewards.watchedCount);
    },
    [rewards.watchedCount],
  );

  // The ONLY place ad consent (and the ad itself) is requested. This only
  // ever runs as a direct result of the user tapping "Watch an ad" below -
  // never on launch, never preloaded, never triggered by tapping a locked
  // reward. useAdConsent caches the result for the session (in memory, not
  // persisted), so this only prompts once per app launch.
  const watchAd = useCallback(async (): Promise<WatchResult> => {
    await consent.ensureConsent();

    const earned = await rewarded.watchAd();
    if (!earned) return { earned: false, unlockedItem: null };

    const before = rewards.watchedCount;
    rewards.recordWatch();
    return { earned: true, unlockedItem: unlockedItemAfter(before + 1) };
  }, [consent, rewarded, rewards.watchedCount, rewards.recordWatch, unlockedItemAfter]);

  const value = useMemo<SupportValue>(
    () => ({
      watchedCount: rewards.watchedCount,
      isUnlocked: rewards.isUnlocked,
      remainingFor,
      unlockedItemAfter,
      watchAd,
      adLoaded: rewarded.loaded,
      adLoading: rewarded.loading,
      rewardsLoaded: rewards.loaded,
      paletteId: palette.paletteId,
      setPaletteId: palette.setPaletteId,
      paletteVariables: palette.variables,
    }),
    [rewards, palette, rewarded, watchAd, remainingFor, unlockedItemAfter],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport(): SupportValue {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used within SupportProvider');
  return ctx;
}
