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

  const matching = useMemo(() => {
    if (!vehicles.length) return [];
    return vehicles.filter((v) => {
      if (fuelType && v.fuelType !== fuelType) return false;
      const price = station.properties.fuels?.[v.fuelType];
      return typeof price === 'number' && isFinite(price);
    });
  }, [vehicles, fuelType, station]);

  if (!matching.length) return null;

  return (
    <View className="bg-surface dark:bg-surface-dark rounded-md p-lg gap-sm">
      <Text className="text-footnote text-label dark:text-label-dark font-semibold uppercase tracking-wide">
        {t('settings.drive_cost_title')}
      </Text>
      {matching.map((v) => {
        const fuelPrice = station.properties.fuels?.[v.fuelType] as number;

        const candidates = stations
          .filter((s) => {
            const p = s.properties.fuels?.[v.fuelType];
            return typeof p === 'number' && p < fuelPrice;
          })
          .sort((a, b) => (a.properties.fuels?.[v.fuelType] as number) - (b.properties.fuels?.[v.fuelType] as number));
        const cheapest = candidates[0];

        const driveCost = distanceKm !== undefined ? roundTripFuelCostKm(distanceKm, v.consumption, fuelPrice) : null;
        const co2 = co2PerTank(v.tankSize, v.fuelType);

        return (
          <View key={v.id} className="bg-grouped-background dark:bg-grouped-background-dark rounded-md p-md gap-xs">
            <Text className="text-callout font-semibold text-label dark:text-label-dark">
              {v.name}
              <Text className="text-secondary-label dark:text-secondary-label-dark font-normal">
                {'  ·  '}{fuelLabel(v.fuelType)} · {v.consumption} L/100km
              </Text>
            </Text>
            {driveCost !== null && (
              <Text className="text-subheadline text-label dark:text-label-dark">
                {t('settings.drive_cost_label')}: <Text className="font-semibold">{driveCost.toFixed(2)} €</Text>
              </Text>
            )}
            <Text className="text-subheadline text-label dark:text-label-dark">
              {t('settings.co2_tank_label')}: <Text className="font-semibold">{co2.toFixed(0)} kg</Text>
            </Text>
            {cheapest ? (
              (() => {
                const minPrice = cheapest.properties.fuels?.[v.fuelType] as number;
                const saving = savingPerTank(fuelPrice - minPrice, v.tankSize);
                const cheapestDistance = stationDistances.get(cheapest.properties.id);
                const costToCheapest =
                  cheapestDistance !== undefined ? roundTripFuelCostKm(cheapestDistance, v.consumption, minPrice) : undefined;
                if (costToCheapest !== undefined) {
                  const worth = saving > costToCheapest;
                  return (
                    <Text className={`text-footnote ${worth ? 'text-price-low dark:text-price-low-dark' : 'text-price-high dark:text-price-high-dark'}`}>
                      {worth
                        ? t('settings.worth_it', { saving: saving.toFixed(2), cost: costToCheapest.toFixed(2) })
                        : t('settings.not_worth', { cost: costToCheapest.toFixed(2), saving: saving.toFixed(2) })}
                    </Text>
                  );
                }
                return (
                  <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
                    {t('settings.cheapest_nearby', { price: minPrice.toFixed(3) })}
                  </Text>
                );
              })()
            ) : (
              <Text className="text-footnote text-price-low dark:text-price-low-dark">
                {t('settings.this_is_cheapest')}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

export const WorthTheDrive = memo(WorthTheDriveComponent);
