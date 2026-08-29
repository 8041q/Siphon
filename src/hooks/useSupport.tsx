import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { useAdConsent } from '../hooks/useAdConsent';

import { useAdRewards, PALETTE_REWARDS, ICON_REWARDS, STYLE_REWARDS } from './useAdRewards';
import type { RewardItem } from './useAdRewards';
import { usePalette } from './usePalette';
import { useIconSet } from './useIconSet';
import { useStyleSet } from './useStyleSet';
import type { IconSetId, IconSetDef } from '../theme/icons';

import { useRewardedAd } from './useRewardedAd';
import { useUserLocationMarker, type UserLocationMarkerConfig } from './useUserLocationMarker';
import type { Palette, PaletteId } from '../theme/palettes';
import type { StyleSetId, StyleRules } from '../theme/styles';

export const ALL_REWARDS: RewardItem[] = [...ICON_REWARDS, ...STYLE_REWARDS, ...PALETTE_REWARDS];

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
  iconSetId: IconSetId;
  setIconSetId: (id: IconSetId) => void;
  iconSet: IconSetDef;
  styleSetId: StyleSetId;
  setStyleSetId: (id: StyleSetId) => void;
  styleRules: StyleRules;
  /**
   * Single shared location-marker instance
   */
  marker: UserLocationMarkerConfig;
  setMarker: (config: UserLocationMarkerConfig) => void;
  markerLoaded: boolean;
  availableMarkers: readonly string[];
}

const SupportContext = createContext<SupportValue | null>(null);

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const rewards = useAdRewards();
  const palette = usePalette();
  const iconSet = useIconSet();
  const styleSet = useStyleSet();
  const rewarded = useRewardedAd();
  const consent = useAdConsent();
  const locationMarker = useUserLocationMarker();

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
      iconSetId: iconSet.iconSetId,
      setIconSetId: iconSet.setIconSetId,
      iconSet: iconSet.iconSet,
      styleSetId: styleSet.styleSetId,
      setStyleSetId: styleSet.setStyleSetId,
      styleRules: styleSet.rules,
      marker: locationMarker.marker,
      setMarker: locationMarker.setMarker,
      markerLoaded: locationMarker.loaded,
      availableMarkers: locationMarker.availableMarkers,
    }),
    [rewards, palette, iconSet, styleSet, rewarded, watchAd, remainingFor, unlockedItemAfter, locationMarker],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport(): SupportValue {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used within SupportProvider');
  return ctx;
}
