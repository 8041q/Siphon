import { useAppearanceLayout } from '../hooks/useAppearanceLayout';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { MutableRefObject } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ALL_REWARDS, useSupport } from '../hooks/useSupport';
import { PALETTES, PALETTE_ORDER } from '../theme/palettes';
import type { PaletteId } from '../theme/palettes';
import { ICON_SET_ORDER, ICON_SETS } from '../theme/icons';
import type { IconSetId } from '../theme/icons';
import { STYLE_SET_ORDER, STYLE_SETS } from '../theme/styles';
import type { StyleSetId } from '../theme/styles';
import { rewardForIcon, rewardForPalette, rewardForStyle } from '../hooks/useAdRewards';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useBottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import { SHEET_HANDLE_INDICATOR_STYLE, SHEET_HANDLE_STYLE } from '../theme/layout';
import { Button } from './ui/button';
import { GlassBox } from './ui/GlassBox';
import { SheetBackground } from './ui/SheetBackground';
import { SheetBackdrop } from './ui/SheetBackdrop';
import { CustomIconsSheet, type CustomIconsSheetHandle } from './CustomIconsSheet';
import type { DensityId } from '../theme/density';
import { MONETIZATION_ENABLED } from '../config/features';

export type RewardsSheetHandle = { present: () => void };

const LOCKED_NOTICE_MS = 1_800;
const UNLOCKED_FLASH_MS = 2_500;
const AD_FAILED_MS = 2_500;

type TimerRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;

type AppearanceSelection =
  | { kind: 'palette'; id: PaletteId }
  | { kind: 'icon'; id: IconSetId }
  | { kind: 'style'; id: StyleSetId }
  | { kind: 'density'; id: DensityId };

function clearTimer(ref: TimerRef): void {
  if (!ref.current) return;
  clearTimeout(ref.current);
  ref.current = null;
}

export const RewardsSheet = forwardRef<RewardsSheetHandle, object>(function RewardsSheet(_props, ref) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { space } = useAppearanceLayout();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const customIconsRef = useRef<CustomIconsSheetHandle>(null);
  const { handleSheetChange, handleSheetDismiss } = useBottomSheetBackHandler(bottomSheetRef);
  const snapPoints = useMemo(() => ['82%'], []);

  const {
    watchedCount,
    isUnlocked,
    remainingFor,
    watchAd,
    adLoading,
    rewardsLoaded,
    paletteId,
    setPaletteId,
    iconSetId,
    setIconSetId,
    styleSetId,
    setStyleSetId,
    densityId,
    setDensityId,
  } = useSupport();

  const [lastUnlockedIds, setLastUnlockedIds] = useState<Set<string>>(() => new Set());
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [adFailed, setAdFailed] = useState(false);

  const mountedRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer(unlockTimerRef);
      clearTimer(noticeTimerRef);
      clearTimer(failedTimerRef);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    present: () => bottomSheetRef.current?.present(),
  }));

  const nextReward = useMemo(
    () => ALL_REWARDS.reduce<(typeof ALL_REWARDS)[number] | undefined>((best, reward) => {
      if (reward.requiredWatches <= watchedCount) return best;
      return !best || reward.requiredWatches < best.requiredWatches ? reward : best;
    }, undefined),
    [watchedCount],
  );

  const handleWatchAd = useCallback(async () => {
    if (working) return;
    setWorking(true);
    setAdFailed(false);
    clearTimer(failedTimerRef);

    const result = await watchAd();
    if (!mountedRef.current) return;
    setWorking(false);

    if (result.earned) {
      if (result.unlockedItems.length > 0) {
        setLastUnlockedIds(new Set(result.unlockedItems.map((item) => item.id)));
        clearTimer(unlockTimerRef);
        unlockTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setLastUnlockedIds(new Set());
          unlockTimerRef.current = null;
        }, UNLOCKED_FLASH_MS);
      }
      return;
    }

    if (result.reason === 'failed') {
      setAdFailed(true);
      failedTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setAdFailed(false);
        failedTimerRef.current = null;
      }, AD_FAILED_MS);
    }
  }, [watchAd, working]);

  const showLockedNotice = useCallback((id: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    setNoticeId(id);
    clearTimer(noticeTimerRef);
    noticeTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setNoticeId((current) => (current === id ? null : current));
      noticeTimerRef.current = null;
    }, LOCKED_NOTICE_MS);
  }, []);

  const applySelection = useCallback((selection: AppearanceSelection) => {
    switch (selection.kind) {
      case 'palette': setPaletteId(selection.id); break;
      case 'icon': setIconSetId(selection.id); break;
      case 'style': setStyleSetId(selection.id); break;
      case 'density': setDensityId(selection.id); break;
    }
  }, [setPaletteId, setIconSetId, setStyleSetId, setDensityId]);

  const selectAppearance = applySelection;

  const handleSelectPalette = useCallback((id: PaletteId) => {
    const reward = rewardForPalette(id);
    if (reward && !isUnlocked(reward.id)) {
      showLockedNotice(id);
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    selectAppearance({ kind: 'palette', id });
  }, [isUnlocked, selectAppearance, showLockedNotice]);

  const handleSelectIcon = useCallback((id: IconSetId) => {
    const reward = rewardForIcon(id);
    if (reward && !isUnlocked(reward.id)) {
      showLockedNotice(id);
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    if (id === 'custom-svg') customIconsRef.current?.present();
    else selectAppearance({ kind: 'icon', id });
  }, [isUnlocked, selectAppearance, showLockedNotice]);

  const handleSelectStyle = useCallback((id: StyleSetId) => {
    const reward = rewardForStyle(id);
    if (reward && !isUnlocked(reward.id)) {
      showLockedNotice(id);
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    selectAppearance({ kind: 'style', id });
  }, [isUnlocked, selectAppearance, showLockedNotice]);

  const trailingFor = (remaining: number, unlocked: boolean, id: string, selected: boolean) => {
    if (lastUnlockedIds.has(id)) {
      return <Text style={{ color: colors.priceLow }} className="text-callout font-semibold">{t('settings.reward_unlocked')}</Text>;
    }
    if (noticeId === id) {
      return <Text style={{ color: colors.tint }} className="text-footnote">{t('settings.reward_locked_notice')}</Text>;
    }
    if (unlocked && !selected) return null;
    if (unlocked) return <Text style={{ color: colors.tint }} className="text-body">✓</Text>;
    return <Text style={{ color: colors.tertiaryLabel }} className="text-footnote">{t('settings.reward_locked_ads', { count: remaining })}</Text>;
  };

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        accessible={false}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        handleStyle={SHEET_HANDLE_STYLE}
        handleIndicatorStyle={[SHEET_HANDLE_INDICATOR_STYLE, { backgroundColor: colors.handleIndicator }]}
        onChange={handleSheetChange}
        onDismiss={handleSheetDismiss}
        backdropComponent={SheetBackdrop}
        backgroundComponent={SheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.lg + insets.bottom }}>
          <Text style={{ color: colors.label }} className="text-title2 font-semibold mb-sm">
            {MONETIZATION_ENABLED ? t('settings.rewards_title') : t('settings.appearance_options_title')}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote mb-lg">
            {MONETIZATION_ENABLED ? t('settings.rewards_caption') : t('settings.appearance_options_caption')}
          </Text>

          {MONETIZATION_ENABLED && <GlassBox component="card" color={colors.fieldBackground} className="rounded-md p-md mb-lg">
            <View className="flex-row items-center justify-between mb-sm">
              <Text style={{ color: colors.label }} className="text-body font-semibold">
                {t('settings.rewards_progress', { count: watchedCount })}
              </Text>
              {nextReward && (
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
                  {t('settings.rewards_next', { ads: nextReward.requiredWatches })}
                </Text>
              )}
            </View>
            <Button onPress={handleWatchAd} disabled={working || !rewardsLoaded} loading={working || adLoading}>
              {t('settings.watch_ad')}
            </Button>
            {working && adLoading && (
              <Text style={{ color: colors.tertiaryLabel }} className="text-caption2 mt-sm">
                {t('settings.rewards_ad_loading')}
              </Text>
            )}
            {adFailed && (
              <Text style={{ color: colors.tertiaryLabel }} className="text-caption2 mt-sm">
                {t('settings.rewards_ad_failed')}
              </Text>
            )}
          </GlassBox>}

          <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
            {t('settings.rewards_palettes')}
          </Text>
          {PALETTE_ORDER.map((id) => {
            const palette = PALETTES[id];
            const reward = rewardForPalette(id);
            const unlocked = !reward || isUnlocked(reward.id);
            const selected = paletteId === id;
            const paletteKeys = ['surface', 'tint'] as const;
            return (
              <TouchableOpacity
                key={id}
                activeOpacity={0.7}
                onPress={() => handleSelectPalette(id)}
                accessibilityRole="button"
                style={{ minHeight: 44 }}
                accessibilityState={{ selected, disabled: !unlocked }}
                className="flex-row items-center justify-between py-md px-sm"
              >
                <View className="flex-row items-center flex-1">
                  <View style={{ backgroundColor: colors.fieldBackground, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 }}>
                    <View className="flex-row items-center -space-x-2">
                      <View style={{ width: 0 }} />
                      {paletteKeys.map((key) => (
                        <View
                          key={`${key}-dark`}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: palette.dark[key],
                            borderWidth: 1,
                            borderColor: colors.separator,
                          }}
                        />
                      ))}
                    </View>
                  </View>
                  <Text
                    style={{ color: selected ? colors.tint : colors.label, marginStart: 8 }}
                    className={`text-body flex-1 ${selected ? 'font-semibold' : ''}`}
                  >
                    {t(`settings.palette_${id}`)}
                  </Text>
                </View>
                {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, id, selected)}
              </TouchableOpacity>
            );
          })}

          <View style={{ backgroundColor: colors.separator }} className="h-px my-md" />

          <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
            {t('settings.rewards_icons')}
          </Text>
          {ICON_SET_ORDER.map((id) => {
            const iconSet = ICON_SETS[id];
            const reward = rewardForIcon(id);
            const unlocked = !reward || isUnlocked(reward.id);
            const selected = iconSetId === id;
            return (
              <TouchableOpacity
                key={id}
                activeOpacity={0.7}
                onPress={() => handleSelectIcon(id)}
                accessibilityRole="button"
                style={{ minHeight: 44 }}
                accessibilityState={{ selected, disabled: !unlocked }}
                className="flex-row items-center justify-between py-md px-sm"
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.groupedBackground, marginEnd: 8 }}
                  >
                    {iconSet.render({ name: 'map.fill', size: 18, color: colors.tint })}
                  </View>
                  <Text style={{ color: selected ? colors.tint : colors.label }} className={`text-body flex-1 ${selected ? 'font-semibold' : ''}`}>
                    {t(iconSet.labelKey)}
                  </Text>
                </View>
                {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, id, selected)}
              </TouchableOpacity>
            );
          })}

          <View style={{ backgroundColor: colors.separator }} className="h-px my-md" />

          <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
            {t('settings.rewards_styles')}
          </Text>
          {STYLE_SET_ORDER.map((id) => {
            const styleSet = STYLE_SETS[id];
            const reward = rewardForStyle(id);
            const unlocked = !reward || isUnlocked(reward.id);
            const selected = styleSetId === id;
            const isGlass = styleSet.tabBar.glass === true;
            return (
              <TouchableOpacity
                key={id}
                activeOpacity={0.7}
                onPress={() => handleSelectStyle(id)}
                accessibilityRole="button"
                style={{ minHeight: 44 }}
                accessibilityState={{ selected, disabled: !unlocked }}
                className="flex-row items-center justify-between py-md px-sm"
              >
                <View className="flex-row items-center flex-1">
                  <View
                    pointerEvents="none"
                    className="items-center justify-center"
                    style={{
                      marginEnd: 8,
                      width: 32, height: 32,
                      backgroundColor: colors.groupedBackground,
                      borderRadius: 8,
                    }}
                  >
                    <View style={{ width: 20, height: 16, borderRadius: id === 'default' ? 3 : 6, borderWidth: isGlass ? 1 : 0, borderColor: colors.tint, backgroundColor: id === 'default' ? colors.tint : colors.surface, transform: [{ rotate: isGlass ? '-12deg' : '0deg' }] }}>
                      <View style={{ width: id === 'default' ? 8 : 12, height: 2, marginTop: 4, marginStart: 3, borderRadius: 1, backgroundColor: id === 'default' ? colors.labelOnTint : colors.tint }} />
                      <View style={{ width: 8, height: 2, marginTop: 2, marginStart: 3, borderRadius: 1, backgroundColor: id === 'default' ? colors.labelOnTint : colors.separator }} />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: selected ? colors.tint : colors.label }} className={`text-body ${selected ? 'font-semibold' : ''}`}>{t(`settings.styleset_${id}`)}</Text>
                    <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{t(`settings.styleset_${id}_description`)}</Text>
                  </View>
                </View>
                {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, id, selected)}
              </TouchableOpacity>
            );
          })}

          <View style={{ backgroundColor: colors.separator }} className="h-px my-md" />
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">{t('settings.density')}</Text>
          {(['compact', 'comfortable'] as const).map(id => (
            <TouchableOpacity key={id} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: densityId === id }} style={{ minHeight: 44 }} className="flex-row items-center justify-between py-md px-sm" onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              selectAppearance({ kind: 'density', id });
            }}>
              <View className="flex-1">
                <Text style={{ color: densityId === id ? colors.tint : colors.label }} className="text-body">{t(`settings.density_${id}`)}</Text>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{t(`settings.density_${id}_description`)}</Text>
              </View>
              {densityId === id && <Text style={{ color: colors.tint }} className="text-body">✓</Text>}
            </TouchableOpacity>
          ))}

          <Text style={{ color: colors.tertiaryLabel }} className="text-caption2 mt-md">
            {MONETIZATION_ENABLED ? t('settings.rewards_footnote') : t('settings.appearance_options_footnote')}
          </Text>
          <Button className="mt-md" onPress={() => bottomSheetRef.current?.dismiss()}>{t('common.done')}</Button>
        </BottomSheetScrollView>
      </BottomSheetModal>
      <CustomIconsSheet ref={customIconsRef} />
    </>
  );
});
