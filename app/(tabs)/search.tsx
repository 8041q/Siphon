import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon } from '../../src/components/ui/icon';
import { StationCard } from '../../src/components/StationCard';
import { FilterSheet } from '../../src/components/FilterSheet';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { useStations, useLocationState, useUI } from '../../src/hooks/useApp';
import { tabBarClearance } from '../../src/theme/layout';
import type { FuelStationFeature } from '../../src/api/siphonClient';
import { roadEstimateKm } from '../../src/utils/routeDistance';

export default function SearchScreen() {
  const { t } = useTranslation();
  const { allStations } = useStations();
  const { setSelectedStation, favorites, toggleFavorite, searchFilter, setSearchFilter } = useUI();
  const { location } = useLocationState();
  const { colors } = useThemeTokens();
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

  const secondaryLabel = colors.secondaryLabel;

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
        const dist = roadEstimateKm(userLat, userLng, slat, slng);
        return { station: s, distance: dist };
      });

      const withinRange = withDistance.filter((d) => d.distance <= maxKm);
      withinRange.sort((a, b) => a.distance - b.distance);

      return withinRange.map((d) => d.station);
    }

    return filtered;
  }, [brandQuery, allStations, searchFilter, location]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View className="flex-1">
        <View className="px-4 flex-row items-center gap-2">
          <View className="flex-1">
            <SearchBar brandQuery={brandQuery} setBrandQuery={setBrandQuery} secondaryLabel={secondaryLabel} />
          </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => filterSheetRef.current?.present()}
              style={{ backgroundColor: colors.groupedBackground, borderRadius: 8, padding: 12 }}
            >
            <View className="relative">
              <Icon name="filter_list" size={20} color={secondaryLabel} />
              {filterCount > 0 && (
                <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: colors.tint, borderRadius: 9999, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text className="text-[10px] font-bold">{filterCount}</Text>
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
  const { colors } = useThemeTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.groupedBackground, borderRadius: 8, paddingHorizontal: 12, height: 44 }}>
      <Icon name="magnifyingglass" size={20} color={secondaryLabel} />
      <TextInput
        value={brandQuery}
        onChangeText={setBrandQuery}
        placeholder={t('search.placeholder')}
        placeholderTextColor={secondaryLabel}
        className="flex-1 ml-2 py-0"
        style={{ color: colors.label, textAlignVertical: 'center' }}
      />
    </View>
  );
}

function StationList({ results, handleStationPress, favorites, onToggleFavorite }: { results: FuelStationFeature[]; handleStationPress: (station: FuelStationFeature) => void; favorites?: Set<string>; onToggleFavorite?: (station: FuelStationFeature) => void }) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const insets = useSafeAreaInsets();
  if (!results || results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-title-3" style={{ color: colors.secondaryLabel }}>
          {t('search.no_results')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 gap-1 pt-lg">
        <Text className="text-headline mb-sm px-4" style={{ color: colors.label }}>
        {t('search.results_header')} ({results.length})
      </Text>
      <FlashList
        data={results}
        keyExtractor={(item) => item.properties.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarClearance(insets.bottom) + 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <StationCard station={item} onPress={handleStationPress} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        )}
      />
    </View>
  );
}

