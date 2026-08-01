import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';

import { Icon } from './ui/icon';
import { SearchFilter } from '../hooks/useApp';
import { FUEL_KEYS, fuelLabel } from '../utils/fuelNames';
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
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const secondaryLabel = isDark ? 'rgba(235, 235, 245, 0.75)' : 'rgba(60, 60, 67, 0.6)';

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
      const current = localFilters.countries ?? [];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      setLocalFilters({ ...localFilters, countries: next.length > 0 ? next : undefined });
    };

    const toggleFuelType = (key: string) => {
      const current = localFilters.fuelTypes ?? [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      setLocalFilters({ ...localFilters, fuelTypes: next.length > 0 ? next : undefined });
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
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        handleStyle={{ marginVertical: 8 }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? 'rgba(235, 235, 245, 0.5)' : 'rgba(60, 60, 67, 0.3)',
          width: 40,
          height: 5,
          borderRadius: 3,
          alignSelf: 'center',
          marginVertical: 8,
        }}
        onDismiss={handleDismiss}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
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
                  onPress={() => setLocalFilters({ ...localFilters, fuelTypes: undefined })}
                  className={`px-4 py-2 rounded-full ${chipBg(!localFilters.fuelTypes || localFilters.fuelTypes.length === 0)}`}
                >
                  <Text className={`text-subheadline ${chipText(!localFilters.fuelTypes || localFilters.fuelTypes.length === 0)}`}>
                    {t('search.any_fuel')}
                  </Text>
                </TouchableOpacity>
                {FUEL_KEYS.map((key) => {
                  const selected = (localFilters.fuelTypes ?? []).includes(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      onPress={() => toggleFuelType(key)}
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
