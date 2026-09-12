import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Icon } from '../../src/components/ui/icon';
import { StationCard } from '../../src/components/StationCard';
import { FilterSheet } from '../../src/components/FilterSheet';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { useStationCatalog, useStationDistances, useStationSync, useLocationState, useUI } from '../../src/hooks/useApp';
import { tabBarClearance } from '../../src/theme/layout';
import type { FuelStationFeature } from '../../src/api/siphonClient';
import { roadEstimateKm } from '../../src/utils/routeDistance';
import { measureSync } from '../../src/utils/perf';

const ItemSeparator = () => <View style={{ height: 12 }} />;

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { allStations } = useStationCatalog();
  const { stationDistances, routedStationIds, distanceLoading } = useStationDistances();
  const { loading, error, offline, reload } = useStationSync();
  const { setSelectedStation, requestMapFocus, favorites, toggleFavorite, searchFilter, setSearchFilter } = useUI();
  const { location } = useLocationState();
  const { colors } = useThemeTokens();
  const filterSheetRef = useRef<{ present: () => void }>(null);

  const [brandQuery, setBrandQuery] = useState('');
  const deferredBrandQuery = useDeferredValue(brandQuery);

  const needsDistanceData = Boolean(searchFilter.maxDistance || searchFilter.sortBy === 'distance');
  const relevantDistances = needsDistanceData ? stationDistances : null;

  const searchIndex = useMemo(() => measureSync('siphon.search.build_index', () => {
    const index = new Map<string, { brandName: string; location: string }>();
    for (const station of allStations) {
      const properties = station.properties;
      const administrativeArea = properties.source === 'PT' ? properties.district : properties.province;
      index.set(properties.id, {
        brandName: `${properties.brand ?? ''}
${properties.name ?? ''}`.toLocaleLowerCase(),
        location: `${properties.municipality}
${administrativeArea}
${properties.address}`.toLocaleLowerCase(),
      });
    }
    return index;
  }, 4), [allStations]);

  const filterCount = useMemo(() => {
    let count = 0;
    if (searchFilter.countries?.length) count++;
    if (searchFilter.fuelTypes?.length) count++;
    if (searchFilter.priceRange) count++;
    if (searchFilter.city?.trim()) count++;
    if (searchFilter.maxDistance) count++;
    if (searchFilter.sortBy) count++;
    return count;
  }, [searchFilter]);

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

  const results = useMemo(() => measureSync('siphon.search.filter_sort', () => {
    const brandNeedle = deferredBrandQuery.trim().toLocaleLowerCase();
    const cityNeedle = searchFilter.city?.trim().toLocaleLowerCase() ?? '';
    const countries = searchFilter.countries;
    const fuelTypes = searchFilter.fuelTypes;
    const priceMax = searchFilter.priceRange?.max;
    const maxDistance = searchFilter.maxDistance;
    const sortBy = searchFilter.sortBy;
    const needsDistance = Boolean(location && (maxDistance || sortBy === 'distance'));
    const distanceById = needsDistance ? new Map<string, number>() : null;

    let result = allStations.filter((station) => {
      const properties = station.properties;

      if (brandNeedle && !searchIndex.get(properties.id)?.brandName.includes(brandNeedle)) return false;

      if (countries?.length && !countries.includes(properties.source)) return false;

      const fuels = properties.fuels ?? {};
      if (fuelTypes?.length && !fuelTypes.some((key) => key in fuels)) return false;

      if (priceMax != null) {
        const relevantPrices = fuelTypes?.length
          ? fuelTypes.map((key) => fuels[key])
          : Object.values(fuels);
        if (!relevantPrices.some((price) => typeof price === 'number' && Number.isFinite(price) && price < priceMax)) {
          return false;
        }
      }

      if (cityNeedle && !searchIndex.get(properties.id)?.location.includes(cityNeedle)) return false;

      if (distanceById && location) {
        const [stationLng, stationLat] = station.geometry.coordinates;
        const distance =
          relevantDistances?.get(properties.id) ??
          roadEstimateKm(location.latitude, location.longitude, stationLat, stationLng);
        distanceById.set(properties.id, distance);
        if (maxDistance && distance > maxDistance) return false;
      }

      return true;
    });

    if (sortBy === 'price') {
      const fuelKey = searchFilter.sortByFuel ?? fuelTypes?.[0] ?? 'gasoline95';
      result = [...result].sort((a, b) => {
        const priceA = a.properties.fuels?.[fuelKey];
        const priceB = b.properties.fuels?.[fuelKey];
        const safeA = typeof priceA === 'number' && Number.isFinite(priceA) ? priceA : Number.POSITIVE_INFINITY;
        const safeB = typeof priceB === 'number' && Number.isFinite(priceB) ? priceB : Number.POSITIVE_INFINITY;
        return safeA - safeB;
      });
    } else if (sortBy === 'distance' && distanceById) {
      result = [...result].sort(
        (a, b) =>
          (distanceById.get(a.properties.id) ?? Number.POSITIVE_INFINITY) -
          (distanceById.get(b.properties.id) ?? Number.POSITIVE_INFINITY),
      );
    }

    return result;
  }, 4), [allStations, deferredBrandQuery, location, relevantDistances, searchFilter, searchIndex]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View className="flex-1">
        <View className="px-4 flex-row items-center gap-2">
          <View className="flex-1">
            <SearchBar brandQuery={brandQuery} setBrandQuery={setBrandQuery} secondaryLabel={colors.secondaryLabel} />
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => filterSheetRef.current?.present()}
            style={{ backgroundColor: colors.groupedBackground, borderRadius: 8, padding: 12 }}
            accessibilityRole="button"
            accessibilityLabel={
              filterCount > 0
                ? t('search.active_filters', { count: filterCount })
                : t('search.filters')
            }
            accessibilityState={{ selected: filterCount > 0 }}
          >
            <View className="relative">
              <Icon name="filter_list" size={20} color={colors.secondaryLabel} />
              {filterCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    end: -6,
                    backgroundColor: colors.tint,
                    borderRadius: 9999,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text className="text-[10px] font-bold" style={{ color: colors.labelOnTint }}>
                    {filterCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {allStations.length > 0 && (offline || error) && (
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

        <StationList
          results={results}
          handleStationPress={handleStationPress}
          handleShowOnMap={handleShowOnMap}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          stationDistances={stationDistances}
          routedStationIds={routedStationIds}
          distanceLoading={distanceLoading}
          loading={loading && allStations.length === 0}
          error={allStations.length === 0 ? error : null}
          onRetry={reload}
        />
      </View>

      <FilterSheet
        ref={filterSheetRef}
        searchFilter={searchFilter}
        onApply={setSearchFilter}
      />
    </SafeAreaView>
  );
}

type SearchBarProps = {
  brandQuery: string;
  setBrandQuery: (query: string) => void;
  secondaryLabel: string;
};

function SearchBar({ brandQuery, setBrandQuery, secondaryLabel }: SearchBarProps) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.groupedBackground,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
      }}
    >
      <Icon name="magnifyingglass" size={20} color={secondaryLabel} />
      <TextInput
        value={brandQuery}
        onChangeText={setBrandQuery}
        placeholder={t('search.placeholder')}
        placeholderTextColor={secondaryLabel}
        style={{
          flex: 1,
          marginStart: 8,
          paddingVertical: 0,
          color: colors.label,
          textAlignVertical: 'center',
        }}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={t('search.placeholder')}
      />
    </View>
  );
}

type StationListProps = {
  results: FuelStationFeature[];
  handleStationPress: (station: FuelStationFeature) => void;
  handleShowOnMap: (station: FuelStationFeature) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (station: FuelStationFeature) => void;
  stationDistances: ReadonlyMap<string, number>;
  routedStationIds: ReadonlySet<string>;
  distanceLoading: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const StationList = memo(function StationList({
  results,
  handleStationPress,
  handleShowOnMap,
  favorites,
  onToggleFavorite,
  stationDistances,
  routedStationIds,
  distanceLoading,
  loading,
  error,
  onRetry,
}: StationListProps) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const insets = useSafeAreaInsets();

  const listExtraData = useMemo(
    () => ({ favorites, stationDistances, routedStationIds, distanceLoading }),
    [favorites, stationDistances, routedStationIds, distanceLoading],
  );

  const renderItem = useCallback(
    ({ item }: { item: FuelStationFeature }) => (
      <StationCard
        station={item}
        onPress={handleStationPress}
        favorite={favorites?.has(item.properties.id) ?? false}
        onToggleFavorite={onToggleFavorite}
        onShowOnMap={handleShowOnMap}
        distanceKm={stationDistances.get(item.properties.id)}
        distanceLoading={distanceLoading}
        distanceRouted={routedStationIds.has(item.properties.id)}
      />
    ),
    [
      favorites,
      handleStationPress,
      handleShowOnMap,
      onToggleFavorite,
      stationDistances,
      routedStationIds,
      distanceLoading,
    ],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center px-xl" accessibilityLiveRegion="polite">
        <Text className="text-title-3 text-center" style={{ color: colors.secondaryLabel }}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-xl gap-md" accessibilityLiveRegion="assertive">
        <Text className="text-title-3 text-center" style={{ color: colors.secondaryLabel }}>
          {t('common.something_went_wrong')}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRetry}
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
    );
  }

  if (results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-xl" accessibilityLiveRegion="polite">
        <Text className="text-title-3 text-center" style={{ color: colors.secondaryLabel }}>
          {t('search.no_results')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 gap-1 pt-lg" style={{ overflow: 'hidden' }}>
      <Text className="text-headline mb-sm px-4" style={{ color: colors.label }}>
        {t('search.results_header')} ({results.length})
      </Text>
      <FlashList
        data={results}
        keyExtractor={(item) => item.properties.id}
        style={{ flex: 1, overflow: 'hidden' }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarClearance(insets.bottom) + 16 }}
        ItemSeparatorComponent={ItemSeparator}
        renderItem={renderItem}
        extraData={listExtraData}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
});
