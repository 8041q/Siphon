import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon } from '../../src/components/ui/icon';
import { StationCard } from '../../src/components/StationCard';
import { FilterSheet } from '../../src/components/FilterSheet';
import { useStations, useLocationState, useUI } from '../../src/hooks/useApp';
import type { FuelStationFeature } from '../../src/api/siphonClient';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    if (searchFilter.fuelTypes && searchFilter.fuelTypes.length > 0) count++;
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

    if (searchFilter.fuelTypes && searchFilter.fuelTypes.length > 0) {
      filtered = filtered.filter((s) => {
        const fuels = s.properties.fuels ?? {};
        return searchFilter.fuelTypes!.some((key) => key in fuels);
      });
    }

    if (searchFilter.priceRange) {
      const max = searchFilter.priceRange.max;
      filtered = filtered.filter((s) => {
        const fuels = s.properties.fuels ?? {};
        if (searchFilter.fuelTypes && searchFilter.fuelTypes.length > 0) {
          return searchFilter.fuelTypes.some((key) => typeof fuels[key] === 'number' && fuels[key] < max);
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
              <Icon name="filter_list" size={20} color={secondaryLabel} />
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
    <View className="flex-row items-center bg-grouped-background dark:bg-grouped-background-dark rounded-md px-3 h-11">
      <Icon name="magnifyingglass" size={20} color={secondaryLabel} />
      <TextInput
        value={brandQuery}
        onChangeText={setBrandQuery}
        placeholder={t('search.placeholder')}
        placeholderTextColor={secondaryLabel}
        className="flex-1 ml-2 text-label dark:text-label-dark py-0"
        style={{ textAlignVertical: 'center' }}
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
    <View className="flex-1 gap-1 pt-lg">
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

