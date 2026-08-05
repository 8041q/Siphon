import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useSupport, ALL_REWARDS } from '../hooks/useSupport';
import { PALETTES, PALETTE_ORDER } from '../theme/palettes';
import type { PaletteId } from '../theme/palettes';
import { ICON_SET_ORDER, ICON_SETS } from '../theme/icons';
import type { IconSetId } from '../theme/icons';
import { STYLE_SET_ORDER } from '../theme/styles';
import type { StyleSetId } from '../theme/styles';
import { rewardForPalette, rewardForSvg, rewardForIcon, rewardForStyle } from '../hooks/useAdRewards';
import { svgRewards, SVG_REWARD_NAMES, type SvgMarkerRewardId } from './userLocationMarkers/rewards';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { Button } from './ui/button';
import { GlassBox } from './ui/GlassBox';
import { SheetBackground } from './ui/SheetBackground';

export type RewardsSheetHandle = { present: () => void };

const LOCKED_NOTICE_MS = 1800;
const UNLOCKED_FLASH_MS = 2500;
const AD_FAILED_MS = 2500;

function swatchStyle(base: string, borderColor: string) {
  return {
    backgroundColor: base,
    borderColor,
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

  const { colors } = useThemeTokens();

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
    setMarker,
    iconSetId,
    setIconSetId,
    styleSetId,
    setStyleSetId,
  } = useSupport();

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

  // The single, only entry point for actually watching an ad
  const handleWatchAd = useCallback(async () => {
    if (working) return;
    setWorking(true);
    setAdFailed(false);
    const result = await watchAd();
    setWorking(false);
    if (result.earned && result.unlockedItem) {
      setLastUnlockedId(result.unlockedItem.id);
      setTimeout(() => setLastUnlockedId(null), UNLOCKED_FLASH_MS);
    } else if (!result.earned && result.reason === 'failed') {
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

  const handleSelectIcon = useCallback(
    (id: IconSetId) => {
      const reward = rewardForIcon(id);
      if (reward && !isUnlocked(reward.id)) {
        showLockedNotice(id);
        return;
      }
      Haptics.selectionAsync();
      setIconSetId(id);
      bottomSheetRef.current?.dismiss();
    },
    [isUnlocked, setIconSetId, showLockedNotice],
  );

  const handleSelectStyle = useCallback(
    (id: StyleSetId) => {
      const reward = rewardForStyle(id);
      if (reward && !isUnlocked(reward.id)) {
        showLockedNotice(id);
        return;
      }
      Haptics.selectionAsync();
      setStyleSetId(id);
      bottomSheetRef.current?.dismiss();
    },
    [isUnlocked, setStyleSetId, showLockedNotice],
  );

  const trailingFor = (remaining: number, unlocked: boolean, id: string) => {
    if (lastUnlockedId === id) {
      return <Text style={{ color: colors.priceLow }} className="text-callout font-semibold">{t('settings.reward_unlocked')}</Text>;
    }
    if (noticeId === id) {
      return <Text style={{ color: colors.tint }} className="text-footnote">{t('settings.reward_locked_notice')}</Text>;
    }
    if (unlocked) {
      return <Text style={{ color: colors.tint }} className="text-body">✓</Text>;
    }
    return <Text style={{ color: colors.tertiaryLabel }} className="text-footnote">{t('settings.reward_locked_ads', { count: remaining })}</Text>;
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
        backgroundColor: colors.handleIndicator,
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundComponent={SheetBackground}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
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
            <Text style={{ color: colors.tertiaryLabel }}  className="text-caption2 mt-sm">
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
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.7}
              onPress={() => handleSelectPalette(id)}
              className="flex-row items-center justify-between py-md px-sm"
            >
              <View className="flex-row items-center flex-1">
                <View className="mr-sm flex-row -space-x-1">
                  <View style={[swatchStyle(palette.light.background, colors.separator), { width: 20, height: 20, borderRadius: 10 }]} />
                  <View style={[swatchStyle(palette.dark.background, colors.separator), { width: 20, height: 20, borderRadius: 10 }]} />
                </View>
                <Text style={{ color: selected ? colors.tint : colors.label }} className={`text-body flex-1 ${selected ? 'font-semibold' : ''}`}>
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
              className="flex-row items-center justify-between py-md px-sm"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-sm"
                  style={{ backgroundColor: colors.groupedBackground }}
                >
                  {iconSet.render({ name: 'star.fill', size: 18, color: colors.tint })}
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
          const reward = rewardForStyle(id);
          const unlocked = !reward || isUnlocked(reward.id);
          const selected = styleSetId === id;
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.7}
              onPress={() => handleSelectStyle(id)}
              className="flex-row items-center justify-between py-md px-sm"
            >
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 items-center justify-center mr-sm border"
                  style={{ backgroundColor: colors.groupedBackground, borderColor: colors.separator }}
                >
                  <View
                    className="w-5 h-5"
                    style={{
                      backgroundColor: colors.tint,
                      borderRadius: id === 'liquid-glass' ? 10 : id === 'retro' ? 2 : 5,
                    }}
                  />
                </View>
                <Text style={{ color: selected ? colors.tint : colors.label }} className={`text-body flex-1 ${selected ? 'font-semibold' : ''}`}>
                  {t(`settings.styleset_${id}`)}
                </Text>
              </View>
              {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, id)}
            </TouchableOpacity>
          );
        })}

        <View style={{ backgroundColor: colors.separator }} className="h-px my-md" />

        <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
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
                  style={{ backgroundColor: colors.groupedBackground }}
                >
                  {SvgComponent && <SvgComponent size={20} color={colors.tint} />}
                </View>
                <Text style={{ color: selected ? colors.tint : colors.label }} className={`text-body flex-1 ${selected ? 'font-semibold' : ''}`}>
                  {t(`settings.reward_svg_${name}`)}
                </Text>
              </View>
              {trailingFor(reward ? remainingFor(reward.id) : 0, unlocked, name)}
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
