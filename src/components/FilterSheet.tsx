import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LayoutChangeEvent, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';

import { Icon } from './ui/icon';
import { Chip } from './ui/chip';
import { GlassBox } from './ui/GlassBox';
import { SearchFilter } from '../hooks/useApp';
import { FUEL_KEYS, fuelLabel } from '../utils/fuelNames';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { SheetBackground } from './ui/SheetBackground';
import type { CountryCode } from '../api/siphonClient';

const PRICE_OPTIONS = [1.65, 1.87, 2.0] as const;
const DISTANCE_OPTIONS = [5, 10, 25, 50, 100] as const;

interface FilterSheetProps {
  searchFilter: SearchFilter;
  onApply: (f: SearchFilter) => void;
}

export const FilterSheet = forwardRef<{ present: () => void }, FilterSheetProps>(
  function FilterSheet({ searchFilter, onApply }, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['90%'], []);
    const { colors } = useThemeTokens();

    const [localFilters, setLocalFilters] = useState(searchFilter);

    const searchFilterRef = useRef(searchFilter);
    searchFilterRef.current = searchFilter;
    const pendingApplyRef = useRef<SearchFilter | null>(null);

    useImperativeHandle(ref, () => ({
      present: () => {
        setLocalFilters(searchFilterRef.current);
        bottomSheetRef.current?.present();
      },
    }), []);

    const toggleCountry = (code: CountryCode) => {
      Haptics.selectionAsync();
      const current = localFilters.countries ?? [];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      setLocalFilters({ ...localFilters, countries: next.length > 0 ? next : undefined });
    };

    const toggleFuelType = (key: string) => {
      Haptics.selectionAsync();
      const current = localFilters.fuelTypes ?? [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      const patch: Partial<SearchFilter> = { fuelTypes: next.length > 0 ? next : undefined };
      if (current.includes(key) && localFilters.sortByFuel === key) {
        patch.sortByFuel = undefined;
        setSortFuelOpen(false);
      }
      setLocalFilters({ ...localFilters, ...patch });
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

    const setSortByFuel = (fuelKey: string) => {
      Haptics.selectionAsync();
      setLocalFilters({ ...localFilters, sortByFuel: localFilters.sortByFuel === fuelKey ? undefined : fuelKey });
      setSortFuelOpen(false);
    };

    const [sortFuelOpen, setSortFuelOpen] = useState(false);
    const [sortFuelBtnHeight, setSortFuelBtnHeight] = useState(0);

    const handleClear = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pendingApplyRef.current = {};
      bottomSheetRef.current?.dismiss();
    };

    const handleApply = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pendingApplyRef.current = localFilters;
      bottomSheetRef.current?.dismiss();
    };

    const handleDismiss = () => {
      if (pendingApplyRef.current) {
        const filters = pendingApplyRef.current;
        pendingApplyRef.current = null;
        onApply(filters);
      }
    };

    const filterCount = useMemo(() => {
      let count = 0;
      if (localFilters.countries && localFilters.countries.length > 0) count++;
      if (localFilters.fuelTypes && localFilters.fuelTypes.length > 0) count++;
      if (localFilters.priceRange) count++;
      if (localFilters.city?.trim()) count++;
      if (localFilters.maxDistance) count++;
      if (localFilters.sortBy) count++;
      return count;
    }, [localFilters]);

    const chipText = (selected: boolean) =>
      selected ? { color: colors.labelOnTint } : { color: colors.label };

    const sortFuelOptions = useMemo(() => {
      if (localFilters.sortBy !== 'price') return [];
      const selected = localFilters.fuelTypes;
      if (!selected || selected.length === 0) return [];
      if (selected.length === 1) return [];
      return selected;
    }, [localFilters.sortBy, localFilters.fuelTypes]);

    const activeSortFuel = useMemo(() => {
      if (localFilters.sortBy !== 'price') return undefined;
      if (sortFuelOptions.length <= 1) return sortFuelOptions[0] ?? localFilters.fuelTypes?.[0] ?? 'gasoline95';
      return localFilters.sortByFuel ?? sortFuelOptions[0];
    }, [localFilters.sortBy, localFilters.sortByFuel, sortFuelOptions, localFilters.fuelTypes]);

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
        onDismiss={handleDismiss}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundComponent={SheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 13 }}>
          <View className="gap-1">
            {/* Country */}
            <View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('search.country')}
              </Text>
              <View className="flex-row gap-2">
                {(['PT', 'ES'] as CountryCode[]).map((code) => {
                  const selected = (localFilters.countries ?? []).includes(code);
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

            {/* Fuel Type */}
            <View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('search.fuel_type')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  selected={!localFilters.fuelTypes || localFilters.fuelTypes.length === 0}
                  onPress={() => setLocalFilters({ ...localFilters, fuelTypes: undefined })}
                  className="rounded-full px-4 py-2"
                >
                  <Text style={chipText(!localFilters.fuelTypes || localFilters.fuelTypes.length === 0)} className="text-subheadline">
                    {t('search.any_fuel')}
                  </Text>
                </Chip>
                {FUEL_KEYS.map((key) => {
                  const selected = (localFilters.fuelTypes ?? []).includes(key);
                  const label = fuelLabel(key);
                  return (
                    <Chip
                      key={key}
                      selected={selected}
                      onPress={() => toggleFuelType(key)}
                      className="rounded-full px-4 py-2"
                    >
                      <Text style={chipText(selected)} className="text-subheadline">
                        {label}
                      </Text>
                    </Chip>
                  );
                })}
              </View>
            </View>

            {/* Price Range */}
            <View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('search.price_range')}
              </Text>
              <View className="flex-row gap-2 flex-wrap">
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

            {/* City */}
            <View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('search.city')}
              </Text>
              <GlassBox component="input" className="rounded-md">
                <TextInput
                  value={localFilters.city ?? ''}
                  onChangeText={setCity}
                  placeholder={t('search.city_placeholder')}
                  placeholderTextColor={colors.placeholder}
                  style={{ backgroundColor: 'transparent', color: colors.label }}
                  className="rounded-md px-3 py-2"
                />
              </GlassBox>
            </View>

            {/* Distance */}
            <View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('search.distance')}
              </Text>
              <View className="flex-row gap-2 flex-wrap">
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
                      <Text style={chipText(selected)} className="text-subheadline">
                        {km} km
                      </Text>
                    </Chip>
                  );
                })}
              </View>
            </View>

            {/* Sort By */}
            <View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('search.sort_by')}
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                <Chip
                  selected={!localFilters.sortBy}
                  onPress={() => setLocalFilters({ ...localFilters, sortBy: undefined, sortByFuel: undefined })}
                  className="rounded-full px-4 py-2"
                >
                  <Text style={chipText(!localFilters.sortBy)} className="text-subheadline">
                    {t('search.no_sort')}
                  </Text>
                </Chip>
                <Chip
                  selected={localFilters.sortBy === 'price'}
                  onPress={() => { setSortFuelOpen(false); setLocalFilters({ ...localFilters, sortBy: localFilters.sortBy === 'price' ? undefined : 'price' }); }}
                  className="rounded-full px-4 py-2"
                >
                  <Text style={chipText(localFilters.sortBy === 'price')} className="text-subheadline">
                    {t('search.sort_price')}
                  </Text>
                </Chip>
                <Chip
                  selected={localFilters.sortBy === 'distance'}
                  onPress={() => { setSortFuelOpen(false); setLocalFilters({ ...localFilters, sortBy: localFilters.sortBy === 'distance' ? undefined : 'distance' }); }}
                  className="rounded-full px-4 py-2"
                >
                  <Text style={chipText(localFilters.sortBy === 'distance')} className="text-subheadline">
                    {t('search.sort_distance')}
                  </Text>
                </Chip>
              </View>
            </View>

            {/* Sort by Fuel (only when price sort is active and multiple fuels selected) */}
            {localFilters.sortBy === 'price' && sortFuelOptions.length > 1 && (
              <View>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                  {t('search.sort_fuel')}
                </Text>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setSortFuelOpen(!sortFuelOpen)}
                    onLayout={(e: LayoutChangeEvent) => setSortFuelBtnHeight(e.nativeEvent.layout.height)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: colors.surface,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: colors.label }} className="text-subheadline">
                      {fuelLabel(activeSortFuel ?? 'gasoline95')}
                    </Text>
                    <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
                      {sortFuelOpen ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                  {sortFuelOpen && (
                    <>
                      <Pressable
                        style={{ position: 'absolute', top: -(sortFuelBtnHeight + 200), left: 0, right: 0, bottom: 0 }}
                        onPress={() => setSortFuelOpen(false)}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          bottom: sortFuelBtnHeight + 4,
                          left: 0,
                          right: 0,
                          backgroundColor: colors.surface,
                          borderRadius: 8,
                          overflow: 'hidden',
                          maxHeight: 200,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: -2 },
                          shadowOpacity: 0.15,
                          shadowRadius: 6,
                          elevation: 8,
                          zIndex: 100,
                        }}
                      >
                        {sortFuelOptions.map((key) => {
                          const isActive = activeSortFuel === key;
                          return (
                            <TouchableOpacity
                              key={key}
                              activeOpacity={0.7}
                              onPress={() => setSortByFuel(key)}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                backgroundColor: isActive ? colors.tint + '18' : 'transparent',
                              }}
                            >
                              <Text style={{ color: isActive ? colors.tint : colors.label }} className="text-subheadline">
                                {fuelLabel(key)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Action buttons */}
            <View className="flex-row gap-3 pt-sm">
              <GlassBox component="card" className="flex-1 rounded-md overflow-hidden">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleClear}
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
                style={{ backgroundColor: colors.tint }}
                className="flex-1 py-3 rounded-md items-center"
              >
                <Text style={{ color: colors.labelOnTint }} className="text-body font-semibold">
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
