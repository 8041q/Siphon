import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';

import { Icon } from '../../src/components/ui/icon';
import { StationCard } from '../../src/components/StationCard';
import { useStations, useLocationState, useUI, SearchFilter } from '../../src/hooks/useApp';
import { FUEL_KEYS, fuelLabel } from '../../src/utils/fuelNames';
import type { FuelStationFeature, CountryCode } from '../../src/api/siphonClient';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PRICE_OPTIONS = [1.65, 1.87, 2.0] as const;
const DISTANCE_OPTIONS = [5, 10, 25, 50, 100] as const;

export default function SearchScreen() {
  const { t } = useTranslation();
  const { allStations } = useStations();
  const { setSelectedStation, favorites, toggleFavorite, searchFilter, setSearchFilter } = useUI();
  const { location } = useLocationState();
  const colorScheme = useColorScheme();
  const filterSheetRef = useRef<{ present: () => void }>(null);

  const [brandQuery, setBrandQuery] = useState('');

  const filterCount = useMemo(() => {
    let count = 0;
    if (searchFilter.countries && searchFilter.countries.length > 0) count++;
    if (searchFilter.fuelType) count++;
    if (searchFilter.priceRange) count++;
    if (searchFilter.city?.trim()) count++;
    if (searchFilter.maxDistance) count++;
    return count;
  }, [searchFilter]);

  const handleStationPress = useCallback(
    (station: FuelStationFeature) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );

  const secondaryLabel = colorScheme === 'dark' ? 'rgba(235, 235, 245, 0.75)' : 'rgba(60, 60, 67, 0.6)';

  const results = useMemo(() => {
    let filtered = allStations;

    if (brandQuery.trim()) {
      const q = brandQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.properties.brand ?? '').toLowerCase().includes(q) ||
          (s.properties.name ?? '').toLowerCase().includes(q)
      );
    }

    if (searchFilter.countries && searchFilter.countries.length > 0) {
      filtered = filtered.filter((s) =>
        searchFilter.countries!.includes(s.properties.source)
      );
    }

    if (searchFilter.fuelType) {
      filtered = filtered.filter((s) => searchFilter.fuelType! in (s.properties.fuels ?? {}));
    }

    if (searchFilter.priceRange) {
      const max = searchFilter.priceRange.max;
      filtered = filtered.filter((s) => {
        const fuels = s.properties.fuels ?? {};
        if (searchFilter.fuelType) {
          return typeof fuels[searchFilter.fuelType] === 'number' && fuels[searchFilter.fuelType] < max;
        }
        return Object.values(fuels).some((p) => Number(p) < max);
      });
    }

    if (searchFilter.city?.trim()) {
      const q = searchFilter.city.trim().toLowerCase();
      filtered = filtered.filter((s) => {
        const p = s.properties;
        return (
          (p.municipality ?? '').toLowerCase().includes(q) ||
          (p.city ?? '').toLowerCase().includes(q) ||
          (p.address ?? '').toLowerCase().includes(q)
        );
      });
    }

    if (searchFilter.maxDistance && location) {
      const maxKm = searchFilter.maxDistance;
      const userLat = location.latitude;
      const userLng = location.longitude;

      const withDistance = filtered.map((s) => {
        const [slng, slat] = s.geometry.coordinates;
        const dist = haversineKm(userLat, userLng, slat, slng);
        return { station: s, distance: dist };
      });

      const withinRange = withDistance.filter((d) => d.distance <= maxKm);
      withinRange.sort((a, b) => a.distance - b.distance);

      return withinRange.map((d) => d.station);
    }

    return filtered;
  }, [brandQuery, allStations, searchFilter, location]);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <View className="flex-1">
        <View className="px-4 flex-row items-center gap-2">
          <View className="flex-1">
            <SearchBar brandQuery={brandQuery} setBrandQuery={setBrandQuery} secondaryLabel={secondaryLabel} />
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => filterSheetRef.current?.present()}
            className="bg-grouped-background dark:bg-grouped-background-dark rounded-md p-3"
          >
            <View className="relative">
              <Icon name="line.3.horizontal.decrease" size={20} color={secondaryLabel} />
              {filterCount > 0 && (
                <View className="absolute -top-1.5 -right-1.5 bg-tint rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                  <Text className="text-[10px] text-white font-bold">{filterCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
        <StationList results={results} handleStationPress={handleStationPress} favorites={favorites} onToggleFavorite={toggleFavorite} />
      </View>

      <FilterSheet
        ref={filterSheetRef}
        searchFilter={searchFilter}
        onApply={setSearchFilter}
      />
    </SafeAreaView>
  );
}

function SearchBar({ brandQuery, setBrandQuery, secondaryLabel }: { brandQuery: string; setBrandQuery: (q: string) => void; secondaryLabel: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center bg-grouped-background dark:bg-grouped-background-dark rounded-md mb-lg px-3 py-2">
      <Icon name="magnifyingglass" size={17} color={secondaryLabel} />
      <TextInput
        value={brandQuery}
        onChangeText={setBrandQuery}
        placeholder={t('search.placeholder')}
        placeholderTextColor={secondaryLabel}
        className="flex-1 ml-2 text-label dark:text-label-dark"
      />
    </View>
  );
}

function StationList({ results, handleStationPress, favorites, onToggleFavorite }: { results: FuelStationFeature[]; handleStationPress: (station: FuelStationFeature) => void; favorites?: Set<string>; onToggleFavorite?: (station: FuelStationFeature) => void }) {
  const { t } = useTranslation();
  if (!results || results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-title-3 text-secondary-label dark:text-secondary-label-dark">
          {t('search.no_results')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Text className="text-headline text-label dark:text-label-dark mb-sm px-4">
        {t('search.results_header')} ({results.length})
      </Text>
      <FlashList
        data={results}
        keyExtractor={(item) => item.properties.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <StationCard station={item} onPress={handleStationPress} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        )}
      />
    </View>
  );
}

interface FilterSheetProps {
  searchFilter: SearchFilter;
  onApply: (f: SearchFilter) => void;
}

const FilterSheet = forwardRef<{ present: () => void }, FilterSheetProps>(
  function FilterSheet({ searchFilter, onApply }, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['90%'], []);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const secondaryLabel = isDark ? 'rgba(235, 235, 245, 0.75)' : 'rgba(60, 60, 67, 0.6)';

    const [localFilters, setLocalFilters] = useState(searchFilter);

    useImperativeHandle(ref, () => ({
      present: () => {
        setLocalFilters(searchFilter);
        bottomSheetRef.current?.present();
      },
    }), [searchFilter]);

    const toggleCountry = (code: CountryCode) => {
      const current = localFilters.countries ?? [];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      setLocalFilters({ ...localFilters, countries: next.length > 0 ? next : undefined });
    };

    const setFuelType = (key: string | undefined) => {
      setLocalFilters({ ...localFilters, fuelType: key });
    };

    const setPriceRange = (max: number | undefined) => {
      setLocalFilters({ ...localFilters, priceRange: max ? { max } : null });
    };

    const setCity = (city: string) => {
      setLocalFilters({ ...localFilters, city: city || undefined });
    };

    const setDistance = (km: number | undefined) => {
      setLocalFilters({ ...localFilters, maxDistance: km });
    };

    const handleClear = () => {
      setLocalFilters({});
    };

    const handleApply = () => {
      bottomSheetRef.current?.dismiss();
      requestIdleCallback(() => {
        onApply(localFilters);
      });
    };

    const filterCount = useMemo(() => {
      let count = 0;
      if (localFilters.countries && localFilters.countries.length > 0) count++;
      if (localFilters.fuelType) count++;
      if (localFilters.priceRange) count++;
      if (localFilters.city?.trim()) count++;
      if (localFilters.maxDistance) count++;
      return count;
    }, [localFilters]);

    const chipBg = (selected: boolean) =>
      selected ? 'bg-tint' : 'bg-surface dark:bg-surface-dark';
    const chipText = (selected: boolean) =>
      selected ? 'text-white' : 'text-label dark:text-label-dark';

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture
        enableDynamicSizing={false}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? 'rgba(235, 235, 245, 0.5)' : 'rgba(60, 60, 67, 0.3)',
        }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <View className="gap-5">
            {/* Country */}
            <View>
              <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
                {t('search.country')}
              </Text>
              <View className="flex-row gap-2">
                {(['PT', 'ES'] as CountryCode[]).map((code) => {
                  const selected = (localFilters.countries ?? []).includes(code);
                  return (
                    <TouchableOpacity
                      key={code}
                      activeOpacity={0.7}
                      onPress={() => toggleCountry(code)}
                      className={`px-4 py-2 rounded-full ${chipBg(selected)}`}
                    >
                      <Text className={`text-subheadline ${chipText(selected)}`}>
                        {code === 'PT' ? t('search.portugal') : t('search.spain')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Fuel Type */}
            <View>
              <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
                {t('search.fuel_type')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setFuelType(undefined)}
                  className={`px-4 py-2 rounded-full ${chipBg(!localFilters.fuelType)}`}
                >
                  <Text className={`text-subheadline ${chipText(!localFilters.fuelType)}`}>
                    {t('search.any_fuel')}
                  </Text>
                </TouchableOpacity>
                {FUEL_KEYS.map((key) => {
                  const selected = localFilters.fuelType === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      onPress={() => setFuelType(selected ? undefined : key)}
                      className={`px-4 py-2 rounded-full ${chipBg(selected)}`}
                    >
                      <Text className={`text-subheadline ${chipText(selected)}`}>
                        {fuelLabel(key)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Price Range */}
            <View>
              <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
                {t('search.price_range')}
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setPriceRange(undefined)}
                  className={`px-4 py-2 rounded-full ${chipBg(!localFilters.priceRange)}`}
                >
                  <Text className={`text-subheadline ${chipText(!localFilters.priceRange)}`}>
                    {t('search.any_price')}
                  </Text>
                </TouchableOpacity>
                {PRICE_OPTIONS.map((max) => {
                  const selected = localFilters.priceRange?.max === max;
                  return (
                    <TouchableOpacity
                      key={max}
                      activeOpacity={0.7}
                      onPress={() => setPriceRange(selected ? undefined : max)}
                      className={`px-4 py-2 rounded-full ${chipBg(selected)}`}
                    >
                      <Text className={`text-subheadline ${chipText(selected)}`}>
                        {t('search.under', { max: max.toFixed(2) })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* City */}
            <View>
              <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
                {t('search.city')}
              </Text>
              <TextInput
                value={localFilters.city ?? ''}
                onChangeText={setCity}
                placeholder={t('search.city_placeholder')}
                placeholderTextColor={secondaryLabel}
                className="bg-surface dark:bg-surface-dark rounded-md px-3 py-2 text-label dark:text-label-dark"
              />
            </View>

            {/* Distance */}
            <View>
              <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
                {t('search.distance')}
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setDistance(undefined)}
                  className={`px-4 py-2 rounded-full ${chipBg(!localFilters.maxDistance)}`}
                >
                  <Text className={`text-subheadline ${chipText(!localFilters.maxDistance)}`}>
                    {t('search.any_distance')}
                  </Text>
                </TouchableOpacity>
                {DISTANCE_OPTIONS.map((km) => {
                  const selected = localFilters.maxDistance === km;
                  return (
                    <TouchableOpacity
                      key={km}
                      activeOpacity={0.7}
                      onPress={() => setDistance(selected ? undefined : km)}
                      className={`px-4 py-2 rounded-full ${chipBg(selected)}`}
                    >
                      <Text className={`text-subheadline ${chipText(selected)}`}>
                        {km} km
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-3 pt-sm">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClear}
                className="flex-1 py-3 rounded-md bg-surface dark:bg-surface-dark items-center"
              >
                <Text className="text-body text-label dark:text-label-dark">
                  {t('search.clear_filters')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleApply}
                className="flex-1 py-3 rounded-md bg-tint items-center"
              >
                <Text className="text-body text-white font-semibold">
                  {t('search.apply')}{filterCount > 0 ? ` (${filterCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
