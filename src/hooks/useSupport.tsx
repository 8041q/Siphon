import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { useAdConsent } from '../hooks/useAdConsent';
import type { PrivacyOptionsResult } from '../hooks/useAdConsent';
import { useAdRewards, REWARDS } from './useAdRewards';
import type { RewardItem } from './useAdRewards';
import { usePalette } from './usePalette';
import { useIconSet } from './useIconSet';
import { useStyleSet } from './useStyleSet';
import { useDensity } from './useDensity';
import { vars } from 'nativewind';
import { appearancePalette } from '../theme/appearance';
import { densityVariables, type DensityId } from '../theme/density';
import { paletteToVariables } from '../theme/variables';
import { DEFAULT_ICON_SET } from '../theme/icons';
import { DEFAULT_STYLE_SET } from '../theme/styles';
import { useCustomIconPack } from './useCustomIconPack';
import { createCustomIconRenderer } from '../theme/icons/sets/custom-svg';
import type { CustomIconPack } from '../theme/customSvg';
import type { IconSetId, IconSetDef } from '../theme/icons';
import { useRewardedAd } from './useRewardedAd';
import { useUserLocationMarker, type UserLocationMarkerConfig } from './useUserLocationMarker';
import type { Palette, PaletteId } from '../theme/palettes';
import type { StyleSetId, StyleRules } from '../theme/styles';
import { appearanceUnlocked, MONETIZATION_ENABLED } from '../config/features';

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
  customIconPack: CustomIconPack | null;
  setCustomIconPack: (pack: CustomIconPack) => Promise<void>;
  styleSetId: StyleSetId;
  setStyleSetId: (id: StyleSetId) => void;
  styleRules: StyleRules;
  densityId: DensityId;
  setDensityId: (id: DensityId) => void;
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
  privacyOptionsRequired: boolean;
  showPrivacyOptions: () => Promise<PrivacyOptionsResult>;
  privacyRefreshing: boolean;
}

const AppearanceSupportContext = createContext<AppearanceSupportValue | null>(null);
const SupportContext = createContext<SupportValue | null>(null);

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const rewards = useAdRewards();
  const paletteState = usePalette();
  const iconSetState = useIconSet();
  const customIcons = useCustomIconPack();
  const iconSet = useMemo(() => iconSetState.iconSetId === 'custom-svg' && customIcons.customIconPack
    ? { ...iconSetState.iconSet, render: createCustomIconRenderer(customIcons.customIconPack.icons) }
    : iconSetState.iconSet, [iconSetState.iconSet, iconSetState.iconSetId, customIcons.customIconPack]);
  const styleSetState = useStyleSet();
  const densityState = useDensity();
  const palette = useMemo(() => appearancePalette(paletteState.palette, styleSetState.styleSetId), [paletteState.palette, styleSetState.styleSetId]);
  const appearanceVariables = useMemo(() => vars({ ...paletteToVariables(palette), ...densityVariables(densityState.densityId) }), [palette, densityState.densityId]);
  const rewarded = useRewardedAd();
  const consent = useAdConsent();
  const locationMarker = useUserLocationMarker();

  const watchedCount = rewards.watchedCount;
  const isUnlocked = useCallback(
    (id: string) => appearanceUnlocked(MONETIZATION_ENABLED, rewards.isUnlocked(id)),
    [rewards.isUnlocked],
  );
  const recordWatch = rewards.recordWatch;
  const rewardsLoaded = rewards.loaded;
  const ensureConsent = consent.ensureConsent;
  const watchRewardedAd = rewarded.watchAd;

  // Older builds accidentally hydrated every reward as unlocked. If a user
  // selected one of those items, the selection itself may still be persisted.
  // Once real reward progress is known, reset any selection the count does not
  // actually entitle the user to.
  useEffect(() => {
    if (!MONETIZATION_ENABLED || !rewardsLoaded) return;
    if (!isUnlocked(paletteState.paletteId)) paletteState.setPaletteId('default');
    if (!isUnlocked(iconSetState.iconSetId)) iconSetState.setIconSetId(DEFAULT_ICON_SET);
    if (!isUnlocked(styleSetState.styleSetId)) styleSetState.setStyleSetId(DEFAULT_STYLE_SET);
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

  // Consent information may refresh on launch, but the consent form and the
  // rewarded-ad request itself are only initiated from an explicit user action.
  const watchAd = useCallback(async (): Promise<WatchResult> => {
    if (!MONETIZATION_ENABLED) return { earned: false, reason: 'failed' };
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
      palette,
      paletteId: paletteState.paletteId,
      setPaletteId: paletteState.setPaletteId,
      paletteVariables: appearanceVariables,
      iconSetId: iconSetState.iconSetId,
      setIconSetId: iconSetState.setIconSetId,
      iconSet,
      customIconPack: customIcons.customIconPack,
      setCustomIconPack: customIcons.setCustomIconPack,
      styleSetId: styleSetState.styleSetId,
      setStyleSetId: styleSetState.setStyleSetId,
      styleRules: styleSetState.rules,
      densityId: densityState.densityId,
      setDensityId: densityState.setDensityId,
      marker: locationMarker.marker,
      setMarker: locationMarker.setMarker,
      markerLoaded: locationMarker.loaded,
      availableMarkers: locationMarker.availableMarkers,
    }),
    [
      palette,
      paletteState.paletteId,
      paletteState.setPaletteId,
      appearanceVariables,
      iconSetState.iconSetId,
      iconSetState.setIconSetId,
      iconSet,
      customIcons.customIconPack,
      customIcons.setCustomIconPack,
      styleSetState.styleSetId,
      styleSetState.setStyleSetId,
      styleSetState.rules,
      densityState.densityId,
      densityState.setDensityId,
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
      privacyOptionsRequired: consent.privacyOptionsRequired,
      showPrivacyOptions: consent.showPrivacyOptions,
      privacyRefreshing: consent.refreshing,
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
      consent.privacyOptionsRequired,
      consent.showPrivacyOptions,
      consent.refreshing,
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
