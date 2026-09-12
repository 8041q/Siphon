import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Chip } from './ui/chip';
import { GlassBox } from './ui/GlassBox';
import type { SearchFilter } from '../hooks/useApp';
import { useBottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import { FUEL_KEYS, fuelLabel } from '../utils/fuelNames';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { SHEET_HANDLE_STYLE, SHEET_HANDLE_INDICATOR_STYLE } from '../theme/layout';
import { SheetBackground } from './ui/SheetBackground';
import type { CountryCode, FuelKey } from '../api/siphonClient';

const PRICE_OPTIONS = [1.65, 1.87, 2.0] as const;
const DISTANCE_OPTIONS = [5, 10, 25, 50, 100] as const;
const PRIMARY_FUELS: readonly FuelKey[] = [
  'gasoline95',
  'diesel',
  'gasoline98',
  'dieselPremium',
  'lpg',
];
const SECONDARY_FUELS = FUEL_KEYS.filter((key) => !PRIMARY_FUELS.includes(key));

interface FilterSheetProps {
  searchFilter: SearchFilter;
  onApply: (filters: SearchFilter) => void;
  showSort?: boolean;
}

function activeFilterCount(filters: SearchFilter, includeSort = true): number {
  let count = 0;
  if (filters.countries?.length) count++;
  if (filters.fuelTypes?.length) count++;
  if (filters.priceRange) count++;
  if (filters.city?.trim()) count++;
  if (filters.maxDistance) count++;
  if (includeSort && filters.sortBy) count++;
  return count;
}

export const FilterSheet = forwardRef<{ present: () => void }, FilterSheetProps>(
  function FilterSheet({ searchFilter, onApply, showSort = true }, ref) {
    const { t } = useTranslation();
    const { colors } = useThemeTokens();
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['90%'], []);
    const { handleSheetChange, handleSheetDismiss } = useBottomSheetBackHandler(bottomSheetRef);

    const [localFilters, setLocalFilters] = useState<SearchFilter>(searchFilter);
    const [showAllFuels, setShowAllFuels] = useState(false);
    const searchFilterRef = useRef(searchFilter);
    searchFilterRef.current = searchFilter;
    const pendingApplyRef = useRef<SearchFilter | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          const current = searchFilterRef.current;
          pendingApplyRef.current = null;
          setLocalFilters(current);
          setShowAllFuels(
            Boolean(current.fuelTypes?.some((fuel) => SECONDARY_FUELS.includes(fuel))),
          );
          bottomSheetRef.current?.present();
        },
      }),
      [],
    );

    const pulse = useCallback(() => {
      void Haptics.selectionAsync().catch(() => undefined);
    }, []);

    const chipText = useCallback(
      (selected: boolean) => ({ color: selected ? colors.labelOnTint : colors.label }),
      [colors.label, colors.labelOnTint],
    );

    const sortFuelOptions = useMemo<readonly FuelKey[]>(() => {
      if (localFilters.fuelTypes?.length) return localFilters.fuelTypes;
      return PRIMARY_FUELS;
    }, [localFilters.fuelTypes]);

    const activeSortFuel = useMemo<FuelKey>(() => {
      const existing = localFilters.sortByFuel;
      return existing && sortFuelOptions.includes(existing) ? existing : sortFuelOptions[0] ?? 'gasoline95';
    }, [localFilters.sortByFuel, sortFuelOptions]);

    const toggleCountry = useCallback(
      (code: CountryCode) => {
        pulse();
        setLocalFilters((current) => {
          const countries = current.countries ?? [];
          const next = countries.includes(code)
            ? countries.filter((country) => country !== code)
            : [...countries, code];
          return { ...current, countries: next.length ? next : undefined };
        });
      },
      [pulse],
    );

    const clearCountries = useCallback(() => {
      pulse();
      setLocalFilters((current) => ({ ...current, countries: undefined }));
    }, [pulse]);

    const clearFuelTypes = useCallback(() => {
      pulse();
      setLocalFilters((current) => ({
        ...current,
        fuelTypes: undefined,
        sortByFuel: current.sortBy === 'price' ? 'gasoline95' : undefined,
      }));
    }, [pulse]);

    const toggleFuelType = useCallback(
      (key: FuelKey) => {
        pulse();
        setLocalFilters((current) => {
          const selected = current.fuelTypes ?? [];
          const next = selected.includes(key)
            ? selected.filter((fuel) => fuel !== key)
            : [...selected, key];
          const nextFuelTypes = next.length ? next : undefined;
          let sortByFuel = current.sortByFuel;

          if (current.sortBy === 'price') {
            const available = nextFuelTypes?.length ? nextFuelTypes : PRIMARY_FUELS;
            if (!sortByFuel || !available.includes(sortByFuel)) sortByFuel = available[0];
          }

          return { ...current, fuelTypes: nextFuelTypes, sortByFuel };
        });
      },
      [pulse],
    );

    const setPriceRange = useCallback((max: number | undefined) => {
      setLocalFilters((current) => ({ ...current, priceRange: max === undefined ? null : { max } }));
    }, []);

    const setDistance = useCallback((maxDistance: number | undefined) => {
      setLocalFilters((current) => ({ ...current, maxDistance }));
    }, []);

    const setSort = useCallback(
      (sortBy: SearchFilter['sortBy']) => {
        pulse();
        setLocalFilters((current) => {
          if (!sortBy) return { ...current, sortBy: undefined, sortByFuel: undefined };
          if (sortBy === 'distance') return { ...current, sortBy, sortByFuel: undefined };

          const available = current.fuelTypes?.length ? current.fuelTypes : PRIMARY_FUELS;
          const sortByFuel = current.sortByFuel && available.includes(current.sortByFuel)
            ? current.sortByFuel
            : available[0];
          return { ...current, sortBy: 'price', sortByFuel };
        });
      },
      [pulse],
    );

    const setSortFuel = useCallback(
      (fuel: FuelKey) => {
        pulse();
        setLocalFilters((current) => ({ ...current, sortByFuel: fuel }));
      },
      [pulse],
    );

    const handleClear = useCallback(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      setLocalFilters((current) => (
        showSort
          ? {}
          : { sortBy: current.sortBy, sortByFuel: current.sortByFuel }
      ));
      setShowAllFuels(false);
    }, [showSort]);

    const handleApply = useCallback(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      pendingApplyRef.current = localFilters;
      bottomSheetRef.current?.dismiss();
    }, [localFilters]);

    const handleDismiss = useCallback(() => {
      handleSheetDismiss();
      const pending = pendingApplyRef.current;
      pendingApplyRef.current = null;
      if (pending) onApply(pending);
    }, [handleSheetDismiss, onApply]);

    const filterCount = useMemo(() => activeFilterCount(localFilters, showSort), [localFilters, showSort]);
    const visibleFuelKeys = showAllFuels ? FUEL_KEYS : PRIMARY_FUELS;
    const hiddenSelectedCount = (localFilters.fuelTypes ?? []).filter((fuel) => SECONDARY_FUELS.includes(fuel)).length;

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        handleStyle={SHEET_HANDLE_STYLE}
        handleIndicatorStyle={[
          SHEET_HANDLE_INDICATOR_STYLE,
          { backgroundColor: colors.handleIndicator },
        ]}
        onChange={handleSheetChange}
        onDismiss={handleDismiss}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundComponent={SheetBackground}
      >
        <View style={{ flex: 1 }}>
          <BottomSheetScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 }}
          >
            <View className="gap-lg">
              <View>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                  {t('search.country')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Chip
                    selected={!localFilters.countries?.length}
                    onPress={clearCountries}
                    className="rounded-full px-4 py-2"
                  >
                    <Text style={chipText(!localFilters.countries?.length)} className="text-subheadline">
                      {t('search.any_country')}
                    </Text>
                  </Chip>
                  {(['PT', 'ES'] as CountryCode[]).map((code) => {
                    const selected = localFilters.countries?.includes(code) ?? false;
                    return (
                      <Chip
                        key={code}
                        selected={selected}
                        onPress={() => toggleCountry(code)}
                        className="rounded-full px-4 py-2"
                      >
                        <Text style={chipText(selected)} className="text-subheadline">
                          {code === 'PT' ? t('search.portugal') : t('search.spain')}
                        </Text>
                      </Chip>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                  {t('search.fuel_type')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Chip
                    selected={!localFilters.fuelTypes?.length}
                    onPress={clearFuelTypes}
                    className="rounded-full px-4 py-2"
                  >
                    <Text style={chipText(!localFilters.fuelTypes?.length)} className="text-subheadline">
                      {t('search.any_fuel')}
                    </Text>
                  </Chip>
                  {visibleFuelKeys.map((key) => {
                    const selected = localFilters.fuelTypes?.includes(key) ?? false;
                    return (
                      <Chip
                        key={key}
                        selected={selected}
                        onPress={() => toggleFuelType(key)}
                        className="rounded-full px-4 py-2"
                      >
                        <Text style={chipText(selected)} className="text-subheadline">
                          {fuelLabel(key)}
                        </Text>
                      </Chip>
                    );
                  })}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowAllFuels((value) => !value)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showAllFuels }}
                  className="self-start mt-sm py-1"
                >
                  <Text style={{ color: colors.tint }} className="text-footnote font-semibold">
                    {showAllFuels
                      ? t('search.fewer_fuels')
                      : t('search.more_fuels', { count: SECONDARY_FUELS.length, selected: hiddenSelectedCount })}
                  </Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                  {t('search.price_range')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Chip
                    selected={!localFilters.priceRange}
                    onPress={() => setPriceRange(undefined)}
                    className="rounded-full px-4 py-2"
                  >
                    <Text style={chipText(!localFilters.priceRange)} className="text-subheadline">
                      {t('search.any_price')}
                    </Text>
                  </Chip>
                  {PRICE_OPTIONS.map((max) => {
                    const selected = localFilters.priceRange?.max === max;
                    return (
                      <Chip
                        key={max}
                        selected={selected}
                        onPress={() => setPriceRange(selected ? undefined : max)}
                        className="rounded-full px-4 py-2"
                      >
                        <Text style={chipText(selected)} className="text-subheadline">
                          {t('search.under', { max: max.toFixed(2) })}
                        </Text>
                      </Chip>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                  {t('search.city')}
                </Text>
                <GlassBox component="input" className="rounded-md">
                  <TextInput
                    value={localFilters.city ?? ''}
                    onChangeText={(city) => setLocalFilters((current) => ({ ...current, city: city || undefined }))}
                    placeholder={t('search.city_placeholder')}
                    placeholderTextColor={colors.placeholder}
                    style={{ backgroundColor: 'transparent', color: colors.label }}
                    className="rounded-md px-3 py-2"
                    accessibilityLabel={t('search.city')}
                  />
                </GlassBox>
              </View>

              <View>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                  {t('search.distance')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Chip
                    selected={!localFilters.maxDistance}
                    onPress={() => setDistance(undefined)}
                    className="rounded-full px-4 py-2"
                  >
                    <Text style={chipText(!localFilters.maxDistance)} className="text-subheadline">
                      {t('search.any_distance')}
                    </Text>
                  </Chip>
                  {DISTANCE_OPTIONS.map((km) => {
                    const selected = localFilters.maxDistance === km;
                    return (
                      <Chip
                        key={km}
                        selected={selected}
                        onPress={() => setDistance(selected ? undefined : km)}
                        className="rounded-full px-4 py-2"
                      >
                        <Text style={chipText(selected)} className="text-subheadline">{km} km</Text>
                      </Chip>
                    );
                  })}
                </View>
              </View>

              {showSort && (
                <View>
                  <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                    {t('search.sort_by')}
                  </Text>
                <View className="flex-row flex-wrap gap-2">
                  {([
                    [undefined, 'search.no_sort'],
                    ['price', 'search.sort_cheapest'],
                    ['distance', 'search.sort_nearest'],
                  ] as const).map(([value, labelKey]) => {
                    const selected = localFilters.sortBy === value;
                    return (
                      <Chip
                        key={value ?? 'recommended'}
                        selected={selected}
                        onPress={() => setSort(value)}
                        className="rounded-full px-4 py-2"
                      >
                        <Text style={chipText(selected)} className="text-subheadline">
                          {t(labelKey)}
                        </Text>
                      </Chip>
                    );
                  })}
                </View>

                {localFilters.sortBy === 'price' && (
                  <View className="mt-md">
                    <Text style={{ color: colors.secondaryLabel }} className="text-footnote mb-sm">
                      {t('search.sort_fuel_hint')}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {sortFuelOptions.map((fuel) => {
                        const selected = activeSortFuel === fuel;
                        return (
                          <Chip
                            key={fuel}
                            selected={selected}
                            onPress={() => setSortFuel(fuel)}
                            className="rounded-full px-4 py-2"
                          >
                            <Text style={chipText(selected)} className="text-subheadline">
                              {fuelLabel(fuel)}
                            </Text>
                          </Chip>
                        );
                      })}
                    </View>
                  </View>
                  )}
                </View>
              )}
            </View>
          </BottomSheetScrollView>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.separator,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: 'transparent',
            }}
          >
            <View className="flex-row gap-3">
              <GlassBox component="card" className="flex-1 rounded-md overflow-hidden">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleClear}
                  accessibilityRole="button"
                  accessibilityLabel={t('search.clear_filters')}
                  className="py-3 items-center"
                >
                  <Text style={{ color: colors.label }} className="text-body">
                    {t('search.clear_filters')}
                  </Text>
                </TouchableOpacity>
              </GlassBox>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleApply}
                accessibilityRole="button"
                accessibilityLabel={t('search.apply')}
                style={{ backgroundColor: colors.tint }}
                className="flex-1 py-3 rounded-md items-center"
              >
                <Text style={{ color: colors.labelOnTint }} className="text-body font-semibold">
                  {t('search.apply')}{filterCount > 0 ? ` (${filterCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BottomSheetModal>
    );
  },
);
