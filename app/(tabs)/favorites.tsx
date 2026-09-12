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
        onToggleFavorite={toggleFavorite}
        onShowOnMap={handleShowOnMap}
        distanceKm={stationDistances.get(item.properties.id)}
        distanceLoading={distanceLoading}
        distanceRouted={routedStationIds.has(item.properties.id)}
      />
    ),
    [
      handleStationPress,
      handleShowOnMap,
      toggleFavorite,
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
        <View className="flex-1 justify-center items-center p-xl" accessibilityLiveRegion="polite">
          <Text className="text-body text-center" style={{ color: colors.secondaryLabel }}>
            {t('common.loading')}
          </Text>
        </View>
      ) : fatalError ? (
        <View className="flex-1 justify-center items-center p-xl gap-md" accessibilityLiveRegion="assertive">
          <Text className="text-body text-center" style={{ color: colors.secondaryLabel }}>
            {t('common.something_went_wrong')}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={reload}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            style={{ backgroundColor: colors.tint }}
            className="rounded-md px-lg py-sm"
          >
            <Text style={{ color: colors.labelOnTint }} className="font-semibold text-callout">
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : favoriteStations.length === 0 ? (
        <View className="flex-1 justify-center items-center p-xl" accessible>
          <Icon name="star.fill" size={48} color={colors.placeholder} />
          <Text className="text-body mt-md text-center" style={{ color: colors.secondaryLabel }}>
            {t('favorites.empty_title')}
          </Text>
          <Text className="text-footnote mt-xs text-center" style={{ color: colors.tertiaryLabel }}>
            {t('favorites.empty_subtitle')}
          </Text>
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
    </SafeAreaView>
  );
}
