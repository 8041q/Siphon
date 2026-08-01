import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
    <View className="bg-surface dark:bg-surface-dark rounded-md p-lg gap-md">
      <Text className="text-footnote text-label dark:text-label-dark font-semibold uppercase tracking-wide">
        {t('settings.drive_cost_title')}
      </Text>
      {matching.map(({ vehicle: v, fuels }) => (
        <View key={v.id} className="bg-grouped-background dark:bg-grouped-background-dark rounded-md p-lg gap-sm">
          <Text className="text-callout font-semibold text-label dark:text-label-dark">
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
            const co2 = f.capacity > 0 ? co2PerTank(f.capacity, f.fuelType) : null;

            return (
              <View key={f.fuelType} className={idx > 0 ? 'border-t border-separator dark:border-separator-dark pt-sm' : undefined}>
                <Text className="text-footnote font-semibold text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-xs">
                  {fuelLabel(f.fuelType)} · {f.consumption} {consumptionUnit(f.fuelType)}
                </Text>
                {driveCost !== null && (
                  <Text className="text-subheadline text-label dark:text-label-dark">
                    {t('settings.drive_cost_label')}: <Text className="font-semibold">{driveCost.toFixed(2)} €</Text>
                  </Text>
                )}
                {co2 !== null && (
                  <Text className="text-subheadline text-label dark:text-label-dark">
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
                        ? roundTripFuelCostKm(cheapestDistance, f.consumption, minPrice)
                        : undefined;
                    if (costToCheapest !== undefined) {
                      const worth = saving > costToCheapest;
                      return (
                        <View className={`flex-row items-start gap-xs mt-xs rounded-sm px-sm py-xs ${worth ? 'bg-price-low/10 dark:bg-price-low-dark/10' : 'bg-price-high/10 dark:bg-price-high-dark/10'}`}>
                          <Text className={`text-subheadline font-semibold ${worth ? 'text-price-low dark:text-price-low-dark' : 'text-price-high dark:text-price-high-dark'}`}>
                            {worth ? '✓ ' : '✕ '}
                          </Text>
                          <Text className={`text-subheadline font-semibold flex-1 ${worth ? 'text-price-low dark:text-price-low-dark' : 'text-price-high dark:text-price-high-dark'}`}>
                            {worth
                              ? t('settings.worth_it', { saving: saving.toFixed(2), cost: costToCheapest.toFixed(2) })
                              : t('settings.not_worth', { cost: costToCheapest.toFixed(2), saving: saving.toFixed(2) })}
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark mt-xs">
                        {t('settings.cheapest_nearby', { price: (cheapest.properties.fuels?.[f.fuelType] as number).toFixed(3) })}
                      </Text>
                    );
                  })()
                ) : (
                  <Text className="text-footnote text-price-low dark:text-price-low-dark mt-xs">
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
