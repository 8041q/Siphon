import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useSupport, ALL_REWARDS } from '../hooks/useSupport';
import { useUserLocationMarker } from '../hooks/useUserLocationMarker';
import { PALETTES, PALETTE_ORDER } from '../theme/palettes';
import type { PaletteId } from '../theme/palettes';
import { rewardForPalette, rewardForSvg } from '../hooks/useAdRewards';
import { svgRewards, SVG_REWARD_NAMES, type SvgMarkerRewardId } from './userLocationMarkers/rewards';
import { Button } from './ui/button';

export type RewardsSheetHandle = { present: () => void };

const LOCKED_NOTICE_MS = 1800;
const UNLOCKED_FLASH_MS = 2500;
const AD_FAILED_MS = 2500;

function swatchStyle(base: string, isDark: boolean) {
  return {
    backgroundColor: base,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
    borderWidth: 1,
  };
}

export const RewardsSheet = forwardRef<RewardsSheetHandle, object>(function RewardsSheet(
  _props,
  ref,
) {
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['82%'], []);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    watchedCount,
    isUnlocked,
    remainingFor,
    watchAd,
    adLoaded,
    adLoading,
    rewardsLoaded,
    paletteId,
    setPaletteId,
  } = useSupport();
  const { setMarker } = useUserLocationMarker();

  const [lastUnlockedId, setLastUnlockedId] = useState<string | null>(null);
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [adFailed, setAdFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    present: () => bottomSheetRef.current?.present(),
  }));

  const nextReward = useMemo(() => {
    return ALL_REWARDS.filter((r) => r.requiredWatches > watchedCount).sort(
      (a, b) => a.requiredWatches - b.requiredWatches,
    )[0];
  }, [watchedCount]);

  // The single, only entry point for actually watching an ad. Everything
  // else in this sheet (tapping a locked palette/marker) is inert - it just
  // surfaces a "watch more ads" notice below.
  const handleWatchAd = useCallback(async () => {
    if (working) return;
    setWorking(true);
    setAdFailed(false);
    const { earned, unlockedItem } = await watchAd();
    setWorking(false);
    if (earned && unlockedItem) {
      setLastUnlockedId(unlockedItem.id);
      setTimeout(() => setLastUnlockedId(null), UNLOCKED_FLASH_MS);
    } else if (!earned) {
      setAdFailed(true);
      setTimeout(() => setAdFailed(false), AD_FAILED_MS);
    }
  }, [watchAd, working]);

  const showLockedNotice = useCallback((id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setNoticeId(id);
    setTimeout(() => setNoticeId((current) => (current === id ? null : current)), LOCKED_NOTICE_MS);
  }, []);

  const handleSelectPalette = useCallback(
    (id: PaletteId) => {
      const reward = rewardForPalette(id);
      if (reward && !isUnlocked(reward.id)) {
        showLockedNotice(id);
        return;
      }
      Haptics.selectionAsync();
      setPaletteId(id);
      bottomSheetRef.current?.dismiss();
    },
    [isUnlocked, setPaletteId, showLockedNotice],
  );

  const handleSelectSvg = useCallback(
    (name: string) => {
      const reward = rewardForSvg(name as SvgMarkerRewardId);
      if (reward && !isUnlocked(reward.id)) {
        showLockedNotice(name);
        return;
      }
      Haptics.selectionAsync();
      setMarker({ type: 'svg', value: name });
      bottomSheetRef.current?.dismiss();
    },
    [isUnlocked, setMarker, showLockedNotice],
  );

  const trailingFor = (remaining: number, unlocked: boolean, id: string) => {
    if (lastUnlockedId === id) {
      return <Text className="text-price-low dark:text-price-low-dark text-callout font-semibold">{t('settings.reward_unlocked')}</Text>;
    }
    if (noticeId === id) {
      return <Text className="text-price-high dark:text-price-high-dark text-footnote font-semibold">{t('settings.reward_locked_notice')}</Text>;
    }
    if (unlocked) {
      return <Text className="text-tint dark:text-tint-dark text-body">✓</Text>;
    }
    return <Text className="text-tertiary-label dark:text-tertiary-label-dark text-footnote">{t('settings.reward_locked_ads', { count: remaining })}</Text>;
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableDynamicSizing={false}
      handleStyle={{ marginVertical: 4 }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? 'rgba(235, 235, 245, 0.3)' : 'rgba(60, 60, 67, 0.3)',
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-title2 font-semibold text-label dark:text-label-dark mb-sm">
          {t('settings.rewards_title')}
        </Text>
        <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark mb-lg">
          {t('settings.rewards_caption')}
        </Text>

        <View className="rounded-md bg-field-background dark:bg-field-background-dark p-md mb-lg">
          <View className="flex-row items-center justify-between mb-sm">
            <Text className="text-body font-semibold text-label dark:text-label-dark">
              {t('settings.rewards_progress', { count: watchedCount })}
            </Text>
            {nextReward && (
              <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
                {t('settings.rewards_next', { ads: nextReward.requiredWatches })}
              </Text>
            )}
          </View>
          <Button onPress={handleWatchAd} disabled={working || !rewardsLoaded} loading={working || adLoading}>
            {t('settings.watch_ad')}
          </Button>
          {working && adLoading && (
            <Text className="text-caption2 text-tertiary-label dark:text-tertiary-label-dark mt-sm">
              {t('settings.rewards_ad_loading')}
            </Text>
          )}
          {adFailed && (
            <Text className="text-caption2 text-price-high dark:text-price-high-dark mt-sm">
              {t('settings.rewards_ad_failed')}
            </Text>
          )}
        </View>

        <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
          {t('settings.rewards_palettes')}
        </Text>
        {PALETTE_ORDER.map((id) => {
          const palette = PALETTES[id];
          const reward = rewardForPalette(id);
          const unlocked = !reward || isUnlocked(reward.id);
          const selected = paletteId === id;
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.7}
              onPress={() => handleSelectPalette(id)}
              className="flex-row items-center justify-between py-md px-sm"
            >
              <View className="flex-row items-center flex-1">
                <View className="mr-sm flex-row -space-x-1">
                  <View style={[swatchStyle(palette.light.background, isDark), { width: 20, height: 20, borderRadius: 10 }]} />
                  <View style={[swatchStyle(palette.dark.background, isDark), { width: 20, height: 20, borderRadius: 10 }]} />
                </View>
                <Text className={`text-body flex-1 ${selected ? 'text-tint dark:text-tint-dark font-semibold' : 'text-label dark:text-label-dark'}`}>
                  {t(`settings.palette_${id}`)}
                </Text>
              </View>
              {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, id)}
            </TouchableOpacity>
          );
        })}

        <View className="h-px bg-separator dark:bg-separator-dark my-md" />

        <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
          {t('settings.rewards_markers')}
        </Text>
        {SVG_REWARD_NAMES.map((name) => {
          const SvgComponent = svgRewards[name];
          const reward = rewardForSvg(name as SvgMarkerRewardId);
          const unlocked = !reward || isUnlocked(reward.id);
          const selected = false;
          return (
            <TouchableOpacity
              key={name}
              activeOpacity={0.7}
              onPress={() => handleSelectSvg(name)}
              className="flex-row items-center justify-between py-md px-sm"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-sm"
                  style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
                >
                  {SvgComponent && <SvgComponent size={20} color="#0C8599" />}
                </View>
                <Text className={`text-body flex-1 ${selected ? 'text-tint dark:text-tint-dark font-semibold' : 'text-label dark:text-label-dark'}`}>
                  {t(`settings.reward_svg_${name}`)}
                </Text>
              </View>
              {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, name)}
            </TouchableOpacity>
          );
        })}

        <Text className="text-caption2 text-tertiary-label dark:text-tertiary-label-dark mt-md">
          {t('settings.rewards_footnote')}
        </Text>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
