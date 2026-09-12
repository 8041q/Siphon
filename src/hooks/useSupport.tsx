import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { useAdConsent } from '../hooks/useAdConsent';
import { useAdRewards, REWARDS } from './useAdRewards';
import type { RewardItem } from './useAdRewards';
import { usePalette } from './usePalette';
import { useIconSet } from './useIconSet';
import { useStyleSet } from './useStyleSet';
import type { IconSetId, IconSetDef } from '../theme/icons';
import { useRewardedAd } from './useRewardedAd';
import { useUserLocationMarker, type UserLocationMarkerConfig } from './useUserLocationMarker';
import type { Palette, PaletteId } from '../theme/palettes';
import type { StyleSetId, StyleRules } from '../theme/styles';

export const ALL_REWARDS: readonly RewardItem[] = REWARDS;

type WatchResult =
  | { earned: true; unlockedItems: readonly RewardItem[] }
  | { earned: false; reason: 'consent' | 'failed' };

export interface AppearanceSupportValue {
  palette: Palette;
  paletteId: PaletteId;
  setPaletteId: (id: PaletteId) => void;
  paletteVariables: Record<string, string>;
  iconSetId: IconSetId;
  setIconSetId: (id: IconSetId) => void;
  iconSet: IconSetDef;
  styleSetId: StyleSetId;
  setStyleSetId: (id: StyleSetId) => void;
  styleRules: StyleRules;
  marker: UserLocationMarkerConfig;
  setMarker: (config: UserLocationMarkerConfig) => void;
  markerLoaded: boolean;
  availableMarkers: readonly string[];
}

interface SupportValue extends AppearanceSupportValue {
  watchedCount: number;
  isUnlocked: (id: string) => boolean;
  /** Ads still needed to unlock `id`. 0 once unlocked. */
  remainingFor: (id: string) => number;
  unlockedItemsAfter: (count: number) => readonly RewardItem[];
  watchAd: () => Promise<WatchResult>;
  adLoaded: boolean;
  adLoading: boolean;
  /** True once reward progress is read. */
  rewardsLoaded: boolean;
}

const AppearanceSupportContext = createContext<AppearanceSupportValue | null>(null);
const SupportContext = createContext<SupportValue | null>(null);

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const rewards = useAdRewards();
  const paletteState = usePalette();
  const iconSetState = useIconSet();
  const styleSetState = useStyleSet();
  const rewarded = useRewardedAd();
  const consent = useAdConsent();
  const locationMarker = useUserLocationMarker();

  const watchedCount = rewards.watchedCount;
  const isUnlocked = rewards.isUnlocked;
  const recordWatch = rewards.recordWatch;
  const rewardsLoaded = rewards.loaded;
  const ensureConsent = consent.ensureConsent;
  const watchRewardedAd = rewarded.watchAd;

  // Older builds accidentally hydrated every reward as unlocked. If a user
  // selected one of those items, the selection itself may still be persisted.
  // Once real reward progress is known, reset any selection the count does not
  // actually entitle the user to.
  useEffect(() => {
    if (!rewardsLoaded) return;
    if (!isUnlocked(paletteState.paletteId)) paletteState.setPaletteId('default');
    if (!isUnlocked(iconSetState.iconSetId)) iconSetState.setIconSetId('ionicons');
    if (!isUnlocked(styleSetState.styleSetId)) styleSetState.setStyleSetId('default');
  }, [
    rewardsLoaded,
    isUnlocked,
    paletteState.paletteId,
    paletteState.setPaletteId,
    iconSetState.iconSetId,
    iconSetState.setIconSetId,
    styleSetState.styleSetId,
    styleSetState.setStyleSetId,
  ]);

  const unlockedItemsAfter = useCallback((count: number): readonly RewardItem[] => {
    return ALL_REWARDS.filter((reward) => reward.requiredWatches === count);
  }, []);

  const remainingFor = useCallback(
    (id: string) => {
      const reward = ALL_REWARDS.find((item) => item.id === id);
      if (!reward) return 0;
      return Math.max(0, reward.requiredWatches - watchedCount);
    },
    [watchedCount],
  );

  // The only place ad consent is requested. This remains user-initiated from
  // the rewards UI and never runs as a side effect of mounting the provider.
  const watchAd = useCallback(async (): Promise<WatchResult> => {
    // Do not let an ad completion race the persisted reward-progress hydration.
    // The rewards UI already disables the button while loading; this guard also
    // makes the provider safe for any future callers.
    if (!rewardsLoaded) return { earned: false, reason: 'failed' };

    const allowed = await ensureConsent();
    if (!allowed) return { earned: false, reason: 'consent' };

    const earned = await watchRewardedAd();
    if (!earned) return { earned: false, reason: 'failed' };

    const nextCount = recordWatch();
    return { earned: true, unlockedItems: unlockedItemsAfter(nextCount) };
  }, [rewardsLoaded, ensureConsent, watchRewardedAd, recordWatch, unlockedItemsAfter]);

  // Theme/style consumers are extremely common (cards, map, tab bar). Keep
  // their context separate from ad/reward state so an ad loading transition
  // does not invalidate every themed surface in the app.
  const appearanceValue = useMemo<AppearanceSupportValue>(
    () => ({
      palette: paletteState.palette,
      paletteId: paletteState.paletteId,
      setPaletteId: paletteState.setPaletteId,
      paletteVariables: paletteState.variables,
      iconSetId: iconSetState.iconSetId,
      setIconSetId: iconSetState.setIconSetId,
      iconSet: iconSetState.iconSet,
      styleSetId: styleSetState.styleSetId,
      setStyleSetId: styleSetState.setStyleSetId,
      styleRules: styleSetState.rules,
      marker: locationMarker.marker,
      setMarker: locationMarker.setMarker,
      markerLoaded: locationMarker.loaded,
      availableMarkers: locationMarker.availableMarkers,
    }),
    [
      paletteState.palette,
      paletteState.paletteId,
      paletteState.setPaletteId,
      paletteState.variables,
      iconSetState.iconSetId,
      iconSetState.setIconSetId,
      iconSetState.iconSet,
      styleSetState.styleSetId,
      styleSetState.setStyleSetId,
      styleSetState.rules,
      locationMarker.marker,
      locationMarker.setMarker,
      locationMarker.loaded,
      locationMarker.availableMarkers,
    ],
  );

  const value = useMemo<SupportValue>(
    () => ({
      ...appearanceValue,
      watchedCount,
      isUnlocked,
      remainingFor,
      unlockedItemsAfter,
      watchAd,
      adLoaded: rewarded.loaded,
      adLoading: rewarded.loading,
      rewardsLoaded,
    }),
    [
      appearanceValue,
      watchedCount,
      isUnlocked,
      remainingFor,
      unlockedItemsAfter,
      watchAd,
      rewarded.loaded,
      rewarded.loading,
      rewardsLoaded,
    ],
  );

  return (
    <AppearanceSupportContext.Provider value={appearanceValue}>
      <SupportContext.Provider value={value}>{children}</SupportContext.Provider>
    </AppearanceSupportContext.Provider>
  );
}

/** Use for palette/style/icon/marker consumers that do not need reward state. */
export function useAppearanceSupport(): AppearanceSupportValue {
  const ctx = useContext(AppearanceSupportContext);
  if (!ctx) throw new Error('useAppearanceSupport must be used within SupportProvider');
  return ctx;
}

export function useSupport(): SupportValue {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used within SupportProvider');
  return ctx;
}
