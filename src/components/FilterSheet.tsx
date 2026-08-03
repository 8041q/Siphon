import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';

import { Icon } from './ui/icon';
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
      return count;
    }, [localFilters]);

    const chipBg = (selected: boolean) =>
      selected ? { backgroundColor: colors.tint } : { backgroundColor: colors.surface };
    const chipText = (selected: boolean) =>
      selected ? { color: colors.labelOnTint } : { color: colors.label };

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
                <TouchableOpacity
                  key={code}
                  activeOpacity={0.7}
                  onPress={() => toggleCountry(code)}
                  style={[chipBg(selected), { paddingHorizontal: 16, paddingVertical: 8 }]}
                  className="rounded-full"
                >
                      <Text style={chipText(selected)} className="text-subheadline">
                        {code === 'PT' ? t('search.portugal') : t('search.spain')}
                      </Text>
                    </TouchableOpacity>
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
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setLocalFilters({ ...localFilters, fuelTypes: undefined })}
                  style={[chipBg(!localFilters.fuelTypes || localFilters.fuelTypes.length === 0), { paddingHorizontal: 16, paddingVertical: 8 }]}
                  className="rounded-full"
                >
                  <Text style={chipText(!localFilters.fuelTypes || localFilters.fuelTypes.length === 0)} className="text-subheadline">
                    {t('search.any_fuel')}
                  </Text>
                </TouchableOpacity>
                {FUEL_KEYS.map((key) => {
                  const selected = (localFilters.fuelTypes ?? []).includes(key);
                  const label = fuelLabel(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      onPress={() => toggleFuelType(key)}
                      style={[chipBg(selected), { paddingHorizontal: 16, paddingVertical: 8 }]}
                      className="rounded-full"
                    >
                      <Text style={chipText(selected)} className="text-subheadline">
                        {label}
                      </Text>
                    </TouchableOpacity>
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
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setPriceRange(undefined)}
                  style={[chipBg(!localFilters.priceRange), { paddingHorizontal: 16, paddingVertical: 8 }]}
                  className="rounded-full"
                >
                  <Text style={chipText(!localFilters.priceRange)} className="text-subheadline">
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
                    style={[chipBg(selected), { paddingHorizontal: 16, paddingVertical: 8 }]}
                    className="rounded-full"
                  >
                      <Text style={chipText(selected)} className="text-subheadline">
                        {t('search.under', { max: max.toFixed(2) })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* City */}
            <View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('search.city')}
              </Text>
              <TextInput
                value={localFilters.city ?? ''}
                onChangeText={setCity}
                placeholder={t('search.city_placeholder')}
                placeholderTextColor={colors.placeholder}
                style={{ backgroundColor: colors.surface, color: colors.label }}
                className="rounded-md px-3 py-2"
              />
            </View>

            {/* Distance */}
            <View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('search.distance')}
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setDistance(undefined)}
                  style={[chipBg(!localFilters.maxDistance), { paddingHorizontal: 16, paddingVertical: 8 }]}
                  className="rounded-full"
                >
                  <Text style={chipText(!localFilters.maxDistance)} className="text-subheadline">
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
                    style={[chipBg(selected), { paddingHorizontal: 16, paddingVertical: 8 }]}
                    className="rounded-full"
                  >
                      <Text style={chipText(selected)} className="text-subheadline">
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
                style={{ backgroundColor: colors.surface }}
                className="flex-1 py-3 rounded-md items-center"
              >
                <Text style={{ color: colors.label }} className="text-body">
                  {t('search.clear_filters')}
                </Text>
              </TouchableOpacity>
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
