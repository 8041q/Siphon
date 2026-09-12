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
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
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

export type RewardsSheetHandle = { present: () => void };

const LOCKED_NOTICE_MS = 1_800;
const UNLOCKED_FLASH_MS = 2_500;
const AD_FAILED_MS = 2_500;

type TimerRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;

function clearTimer(ref: TimerRef): void {
  if (!ref.current) return;
  clearTimeout(ref.current);
  ref.current = null;
}

export const RewardsSheet = forwardRef<RewardsSheetHandle, object>(function RewardsSheet(_props, ref) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
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

  const handleSelectPalette = useCallback((id: PaletteId) => {
    const reward = rewardForPalette(id);
    if (reward && !isUnlocked(reward.id)) {
      showLockedNotice(id);
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    setPaletteId(id);
    bottomSheetRef.current?.dismiss();
  }, [isUnlocked, setPaletteId, showLockedNotice]);

  const handleSelectIcon = useCallback((id: IconSetId) => {
    const reward = rewardForIcon(id);
    if (reward && !isUnlocked(reward.id)) {
      showLockedNotice(id);
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    setIconSetId(id);
    bottomSheetRef.current?.dismiss();
  }, [isUnlocked, setIconSetId, showLockedNotice]);

  const handleSelectStyle = useCallback((id: StyleSetId) => {
    const reward = rewardForStyle(id);
    if (reward && !isUnlocked(reward.id)) {
      showLockedNotice(id);
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    setStyleSetId(id);
    bottomSheetRef.current?.dismiss();
  }, [isUnlocked, setStyleSetId, showLockedNotice]);

  const trailingFor = (remaining: number, unlocked: boolean, id: string) => {
    if (lastUnlockedIds.has(id)) {
      return <Text style={{ color: colors.priceLow }} className="text-callout font-semibold">{t('settings.reward_unlocked')}</Text>;
    }
    if (noticeId === id) {
      return <Text style={{ color: colors.tint }} className="text-footnote">{t('settings.reward_locked_notice')}</Text>;
    }
    if (unlocked) return <Text style={{ color: colors.tint }} className="text-body">✓</Text>;
    return <Text style={{ color: colors.tertiaryLabel }} className="text-footnote">{t('settings.reward_locked_ads', { count: remaining })}</Text>;
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableDynamicSizing={false}
      handleStyle={SHEET_HANDLE_STYLE}
      handleIndicatorStyle={[SHEET_HANDLE_INDICATOR_STYLE, { backgroundColor: colors.handleIndicator }]}
      onChange={handleSheetChange}
      onDismiss={handleSheetDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundComponent={SheetBackground}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
        <Text style={{ color: colors.label }} className="text-title2 font-semibold mb-sm">
          {t('settings.rewards_title')}
        </Text>
        <Text style={{ color: colors.secondaryLabel }} className="text-footnote mb-lg">
          {t('settings.rewards_caption')}
        </Text>

        <GlassBox component="card" color={colors.fieldBackground} className="rounded-md p-md mb-lg">
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
        </GlassBox>

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
              {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, id)}
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
                  {t(`settings.iconset_${id}`)}
                </Text>
              </View>
              {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, id)}
            </TouchableOpacity>
          );
        })}

        <View style={{ backgroundColor: colors.separator }} className="h-px my-md" />

        <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
          {t('settings.rewards_styles')}
        </Text>
        {STYLE_SET_ORDER.map((id) => {
          const styleSet = STYLE_SETS[id];
          const cardRules = styleSet.card;
          const reward = rewardForStyle(id);
          const unlocked = !reward || isUnlocked(reward.id);
          const selected = styleSetId === id;
          const isGlass = cardRules.glass === true;
          const radius = cardRules.borderRadius ?? 8;
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.7}
              onPress={() => handleSelectStyle(id)}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !unlocked }}
              className="flex-row items-center justify-between py-md px-sm"
            >
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 items-center justify-center border"
                  style={{
                    marginEnd: 8,
                    backgroundColor: colors.groupedBackground,
                    borderColor: isGlass ? colors.tint : colors.separator,
                    borderRadius: radius,
                    borderStyle: cardRules.borderStyle ?? 'solid',
                    borderWidth: isGlass ? 1.5 : (cardRules.borderWidth ?? 0),
                    overflow: 'hidden',
                  }}
                >
                  {isGlass && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bottom: 2,
                        left: 2,
                        borderRadius: Math.max(0, radius - 2),
                        backgroundColor: colors.tint,
                        opacity: 0.08,
                      }}
                    />
                  )}
                </View>
                <Text style={{ color: selected ? colors.tint : colors.label }} className={`text-body flex-1 ${selected ? 'font-semibold' : ''}`}>
                  {t(`settings.styleset_${id}`)}
                </Text>
              </View>
              {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, id)}
            </TouchableOpacity>
          );
        })}

        <Text style={{ color: colors.tertiaryLabel }} className="text-caption2 mt-md">
          {t('settings.rewards_footnote')}
        </Text>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
