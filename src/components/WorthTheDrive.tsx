import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { useSupport } from '../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../hooks/useStyleConfig';
import { GlassBackdrop } from './ui/glass';
import type { FuelStationFeature } from '../api/siphonClient';
import { useStations } from '../hooks/useApp';
import { useVehicles } from '../hooks/useVehicles';
import { fuelLabel } from '../utils/fuelNames';
import {
  roundTripFuelCostKm,
  co2PerTank,
  savingPerTank,
  normalizeFuelPrice,
  consumptionUnit,
} from '../utils/vehicles';

interface WorthTheDriveProps {
  station: FuelStationFeature;
  distanceKm?: number;
  fuelType?: string;
}

const WorthTheDriveComponent = ({ station, distanceKm, fuelType }: WorthTheDriveProps) => {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const cardRules = useStyleConfig(styleRules, 'card');
  const cardGlass = isGlass(cardRules);
  const chipRules = useStyleConfig(styleRules, 'chip');
  const { vehicles } = useVehicles();
  const { stations, stationDistances } = useStations();

  const source = station.properties.source as string | undefined;

  const matching = useMemo(() => {
    if (!vehicles.length) return [];
    return vehicles
      .map((v) => ({
        vehicle: v,
        fuels: v.fuels.filter((f) => {
          if (fuelType && f.fuelType !== fuelType) return false;
          const price = station.properties.fuels?.[f.fuelType];
          return typeof price === 'number' && isFinite(price);
        }),
      }))
      .filter((x) => x.fuels.length > 0);
  }, [vehicles, fuelType, station]);

  if (!matching.length) return null;

  return (
    <View style={[{ backgroundColor: cardGlass ? 'transparent' : colors.surface }, applyComponentRules(cardRules)]} className="rounded-md p-lg gap-md">
      {cardGlass && <GlassBackdrop color={colors.surface} />}
      <Text style={{ color: colors.label }} className="text-footnote font-semibold uppercase tracking-wide">
        {t('settings.drive_cost_title')}
      </Text>
      {matching.map(({ vehicle: v, fuels }) => (
        <View key={v.id} style={{ backgroundColor: colors.groupedBackground }} className="rounded-md p-lg gap-sm">
          <Text style={{ color: colors.label }} className="text-callout font-semibold">
            {v.name}
          </Text>
          {fuels.map((f, idx) => {
            const rawPrice = station.properties.fuels?.[f.fuelType] as number;
            const fuelPrice = normalizeFuelPrice(f.fuelType, rawPrice, source);

            const norm = (s: FuelStationFeature) =>
              normalizeFuelPrice(f.fuelType, s.properties.fuels?.[f.fuelType] as number, s.properties.source);

            const candidates = stations
              .filter((s) => {
                const p = s.properties.fuels?.[f.fuelType];
                return typeof p === 'number' && norm(s) < fuelPrice;
              })
              .sort((a, b) => norm(a) - norm(b));
            const cheapest = candidates[0];

            const driveCost = distanceKm !== undefined ? roundTripFuelCostKm(distanceKm, f.consumption, fuelPrice) : null;
            const co2 = f.capacity > 0 ? co2PerTank(f.capacity, f.fuelType, f.consumption) : null;

            return (
              <View key={f.fuelType} className={idx > 0 ? 'border-t pt-sm' : undefined} style={idx > 0 ? { borderColor: colors.separator } : undefined}>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote font-semibold uppercase tracking-wide mb-xs">
                  {fuelLabel(f.fuelType)} · {f.consumption} {consumptionUnit(f.fuelType)}
                </Text>
                {driveCost !== null && (
                  <Text style={{ color: colors.label }} className="text-subheadline">
                    {t('settings.drive_cost_label')}: <Text className="font-semibold">{driveCost.toFixed(2)} €</Text>
                  </Text>
                )}
                {co2 !== null && (
                  <Text style={{ color: colors.label }} className="text-subheadline">
                    {t('settings.co2_tank_label')}: <Text className="font-semibold">{co2.toFixed(0)} kg</Text>
                  </Text>
                )}
                {cheapest ? (
                  (() => {
                    const minPrice = norm(cheapest);
                    const saving = savingPerTank(fuelPrice - minPrice, f.capacity);
                    const cheapestDistance = stationDistances.get(cheapest.properties.id);
                    const costToCheapest =
                      cheapestDistance !== undefined
                        ? roundTripFuelCostKm(cheapestDistance, f.consumption, fuelPrice)
                        : undefined;
                    if (costToCheapest !== undefined) {
                      const worth = saving > costToCheapest;
                      return (
                        <View className="flex-row items-start gap-xs mt-xs rounded-sm px-sm py-xs" style={[{ backgroundColor: worth ? colors.priceLowTint : colors.priceHighTint }, applyComponentRules(chipRules)]}>
                          <Text className="text-subheadline font-semibold" style={{ color: worth ? colors.priceLow : colors.priceHigh }}>
                            {worth ? '✓ ' : '✕ '}
                          </Text>
                          <Text className="text-subheadline font-semibold flex-1" style={{ color: worth ? colors.priceLow : colors.priceHigh }}>
                            {worth
                              ? t('settings.worth_it', { saving: saving.toFixed(2), cost: costToCheapest.toFixed(2) })
                              : t('settings.not_worth', { cost: costToCheapest.toFixed(2), saving: saving.toFixed(2) })}
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <Text style={{ color: colors.secondaryLabel }} className="text-footnote mt-xs">
                        {t('settings.cheapest_nearby', { price: (cheapest.properties.fuels?.[f.fuelType] as number).toFixed(3) })}
                      </Text>
                    );
                  })()
                ) : (
                  <Text style={{ color: colors.priceLow }} className="text-footnote mt-xs">
                    {t('settings.this_is_cheapest')}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export const WorthTheDrive = memo(WorthTheDriveComponent);