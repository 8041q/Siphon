import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { useAdConsent } from '../hooks/useAdConsent';

import { useAdRewards, SVG_REWARDS, PALETTE_REWARDS } from './useAdRewards';
import type { RewardItem } from './useAdRewards';
import { usePalette } from './usePalette';
import { useRewardedAd } from './useRewardedAd';
import { useUserLocationMarker, DEFAULT_MARKER, type UserLocationMarkerConfig } from './useUserLocationMarker';
import type { Palette, PaletteId } from '../theme/palettes';

export const ALL_REWARDS: RewardItem[] = [...SVG_REWARDS, ...PALETTE_REWARDS];

type WatchResult =
  | { earned: true; unlockedItem: RewardItem | null }
  | { earned: false; reason: 'consent' | 'failed' };

interface SupportValue {
  watchedCount: number;
  isUnlocked: (id: string) => boolean;
  /** Ads still needed to unlock `id`. 0 once unlocked. */
  remainingFor: (id: string) => number;
  unlockedItemAfter: (count: number) => RewardItem | null;
  watchAd: () => Promise<WatchResult>;
  adLoaded: boolean;
  adLoading: boolean;
  palette: Palette;
  /** True once reward progress is read */
  rewardsLoaded: boolean;
  paletteId: PaletteId;
  setPaletteId: (id: PaletteId) => void;
  paletteVariables: Record<string, string>;
  /**
   * Single shared location-marker instance
   */
  marker: UserLocationMarkerConfig;
  setMarker: (config: UserLocationMarkerConfig) => void;
  markerLoaded: boolean;
  availableIcons: readonly string[];
}

const SupportContext = createContext<SupportValue | null>(null);

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const rewards = useAdRewards();
  const palette = usePalette();
  const rewarded = useRewardedAd();
  const consent = useAdConsent();
  const locationMarker = useUserLocationMarker();

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

  // The ONLY place ad consent is requested.
  // Only runs as a direct result of the user tapping "Watch an ad"
  // never on launch, never preloaded, never triggered elsewhere
  const watchAd = useCallback(async (): Promise<WatchResult> => {
    const allowed = await consent.ensureConsent();
    if (!allowed) return { earned: false, reason: 'consent' };

    const earned = await rewarded.watchAd();
    if (!earned) return { earned: false, reason: 'failed' };

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
      palette: palette.palette,
      paletteId: palette.paletteId,
      setPaletteId: palette.setPaletteId,
      paletteVariables: palette.variables,
      marker: locationMarker.marker,
      setMarker: locationMarker.setMarker,
      markerLoaded: locationMarker.loaded,
      availableIcons: locationMarker.availableIcons,
    }),
    [rewards, palette, rewarded, watchAd, remainingFor, unlockedItemAfter, locationMarker],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport(): SupportValue {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used within SupportProvider');
  return ctx;
}
