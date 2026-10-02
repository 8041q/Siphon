import { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { StationCard } from '../../src/components/StationCard';
import { useStationCatalog, useStationDistances, useStationSync, useUI } from '../../src/hooks/useApp';
import { Icon } from '../../src/components/ui/icon';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { tabBarClearance } from '../../src/theme/layout';
import type { FuelStationFeature } from '../../src/api/siphonClient';
import { useTransientFeedback } from '../../src/hooks/useTransientFeedback';
import { ScreenState } from '../../src/components/ui/ScreenState';
import { GlassBox } from '../../src/components/ui/GlassBox';

const ItemSeparator = () => <View style={{ height: 12 }} />;

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { allStations, getStationById } = useStationCatalog();
  const { stationDistances, routedStationIds, distanceLoading } = useStationDistances();
  const { loading, error, offline, reload } = useStationSync();
  const { favorites, setSelectedStation, requestMapFocus, toggleFavorite } = useUI();
  const { colors } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { feedback: removed, show: showRemoved, dismiss: dismissRemoved } = useTransientFeedback<FuelStationFeature>(6000);
  const handleToggleFavorite = useCallback((station: FuelStationFeature) => {
    if (favorites.has(station.properties.id)) showRemoved(station);
    toggleFavorite(station);
  }, [favorites, showRemoved, toggleFavorite]);
  const handleUndo = useCallback(() => {
    if (removed && !favorites.has(removed.properties.id)) toggleFavorite(removed);
    dismissRemoved();
  }, [removed, favorites, toggleFavorite, dismissRemoved]);

  const favoriteStations = useMemo(
    () =>
      [...favorites]
        .map((id) => getStationById(id))
        .filter((station): station is FuelStationFeature => station !== undefined),
    [favorites, getStationById],
  );

  const handleStationPress = useCallback(
    (station: FuelStationFeature) => {
      setSelectedStation(station);
    },
    [setSelectedStation],
  );

  const handleShowOnMap = useCallback(
    (station: FuelStationFeature) => {
      requestMapFocus(station);
      router.navigate('/');
    },
    [requestMapFocus, router],
  );

  const listExtraData = useMemo(
    () => ({ stationDistances, routedStationIds, distanceLoading }),
    [stationDistances, routedStationIds, distanceLoading],
  );

  const renderItem = useCallback(
    ({ item }: { item: FuelStationFeature }) => (
      <StationCard
        station={item}
        onPress={handleStationPress}
        favorite
        onToggleFavorite={handleToggleFavorite}
        onShowOnMap={handleShowOnMap}
        distanceKm={stationDistances.get(item.properties.id)}
        distanceLoading={distanceLoading}
        distanceRouted={routedStationIds.has(item.properties.id)}
      />
    ),
    [
      handleStationPress,
      handleShowOnMap,
      handleToggleFavorite,
      stationDistances,
      routedStationIds,
      distanceLoading,
    ],
  );

  const hasStationData = allStations.length > 0;
  const fatalError = Boolean(error && !hasStationData);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {hasStationData && (offline || error) && (
        <View
          style={{ backgroundColor: colors.groupedBackground }}
          className="mx-4 mt-sm rounded-md px-md py-sm"
          accessibilityLiveRegion="polite"
        >
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote text-center">
            {t('common.using_cached_data')}
          </Text>
        </View>
      )}

      {loading && !hasStationData ? (
        <ScreenState message={t('common.loading')} />
      ) : fatalError ? (
        <ScreenState error message={t('common.something_went_wrong')} action={t('common.retry')} onAction={reload} />
      ) : favoriteStations.length === 0 ? (
        <View className="flex-1 justify-center items-center p-xl">
          <Icon name="star.fill" size={48} color={colors.placeholder} />
          <Text className="text-body mt-md text-center" style={{ color: colors.secondaryLabel }}>
            {t('favorites.empty_title')}
          </Text>
          <Text className="text-footnote mt-xs text-center" style={{ color: colors.tertiaryLabel }}>
            {t('favorites.empty_subtitle')}
          </Text>
          <TouchableOpacity onPress={() => router.navigate('/search')} accessibilityRole="button" style={{ paddingVertical: 12, marginTop: 8 }}>
            <Text className="text-callout font-semibold" style={{ color: colors.tint }}>{t('favorites.browse_stations')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={favoriteStations}
          keyExtractor={(item) => item.properties.id}
          style={{ flex: 1, overflow: 'hidden' }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: tabBarClearance(insets.bottom) + 16,
          }}
          ItemSeparatorComponent={ItemSeparator}
          renderItem={renderItem}
          extraData={listExtraData}
        />
      )}
      {removed && !favorites.has(removed.properties.id) && (
        <View style={{ position: 'absolute', bottom: tabBarClearance(insets.bottom) + 8, left: 16, right: 16 }}>
          <GlassBox component="card" className="rounded-md px-md py-xs flex-row items-center gap-sm">
            <Text accessibilityLiveRegion="polite" numberOfLines={2} style={{ flex: 1, color: colors.label }} className="text-footnote">{t('favorites.removed', { name: removed.properties.brand || removed.properties.name || t('common.unknown_station') })}</Text>
            <TouchableOpacity onPress={handleUndo} accessibilityRole="button" style={{ paddingVertical: 12, paddingHorizontal: 8 }}>
              <Text className="text-callout font-semibold" style={{ color: colors.tint }}>{t('common.undo')}</Text>
            </TouchableOpacity>
          </GlassBox>
        </View>
      )}
    </SafeAreaView>
  );
}
