import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { fuelLabel } from '../utils/fuelNames';
import { FilterButton } from './ui/FilterButton';

export type MarketCountry = 'pt' | 'es' | 'combined';
export type MarketFuel = 'gasoline95' | 'diesel';

function FilterGroup<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useThemeTokens();

  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2, borderRadius: 8, backgroundColor: colors.groupedBackground }}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <FilterButton
            key={option.value}
            label={option.label}
            selected={selected}
            transparent
            accessibilityLabel={`${label}: ${option.label}`}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(option.value);
            }}
          />
        );
      })}
    </View>
  );
}

export function MarketFilters({ country, fuel, onCountryChange, onFuelChange }: {
  country: MarketCountry;
  fuel: MarketFuel;
  onCountryChange: (country: MarketCountry) => void;
  onFuelChange: (fuel: MarketFuel) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      <FilterGroup<MarketCountry>
        label={t('search.country')}
        options={[
          { value: 'pt', label: t('market.country_pt') },
          { value: 'es', label: t('market.country_es') },
          { value: 'combined', label: t('market.country_combined') },
        ]}
        value={country}
        onChange={onCountryChange}
      />
      <FilterGroup<MarketFuel>
        label={t('search.fuel_type')}
        options={[
          { value: 'gasoline95', label: fuelLabel('gasoline95') },
          { value: 'diesel', label: fuelLabel('diesel') },
        ]}
        value={fuel}
        onChange={onFuelChange}
      />
    </View>
  );
}
