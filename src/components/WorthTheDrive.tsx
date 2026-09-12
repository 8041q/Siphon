import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { isFuelKey, type FuelKey, type FuelStationFeature } from '../api/siphonClient';
import { useStationCatalog, useStationDistances } from '../hooks/useApp';
import { useVehicles } from '../hooks/useVehicles';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { fuelLabel, fuelUnit } from '../utils/fuelNames';
import { capacityUnit } from '../utils/vehicles';
import { GlassBox } from './ui/GlassBox';

const COMPARISON_RADIUS_KM = 25;
const MONEY_EPSILON = 0.01;

function expectedPriceQuantityUnit(fuel: FuelKey, source: 'PT' | 'ES'): string {
  if (fuel === 'cngm3') return 'm³';
  if (
    fuel === 'cng' ||
    fuel === 'cngkg' ||
    fuel === 'bioCng' ||
    fuel === 'lng' ||
    fuel === 'bioLng' ||
    fuel === 'hydrogen'
  ) {
    return 'kg';
  }
  // Published Portuguese LPG is priced per kg; Spanish LPG is per litre.
  if (fuel === 'lpg') return source === 'PT' ? 'kg' : 'L';
  return 'L';
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function displayStationName(station: FuelStationFeature): string {
  return station.properties.brand || station.properties.name || station.properties.municipality;
}

type Comparison = {
  key: string;
  vehicleName: string;
  fuel: FuelKey;
  capacity: number;
  capacityUnit: string;
  stationPrice: number;
  roundTripKm: number;
  targetTripCost: number;
  targetReachable: boolean;
  referenceStationName: string | null;
  referencePrice: number | null;
  referenceDistanceKm: number | null;
  referenceTripCost: number | null;
  grossFuelSaving: number;
  extraTripCost: number;
  netSaving: number;
  breakEvenFill: number | null;
  breakEvenExceedsCapacity: boolean;
  unitMismatch: boolean;
  fullyRouted: boolean;
};

export function WorthTheDrive({
  station,
  distanceKm,
  distanceRouted = false,
}: {
  station: FuelStationFeature;
  distanceKm: number;
  distanceRouted?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { vehicles } = useVehicles();
  const { allStations } = useStationCatalog();
  const { stationDistances, routedStationIds } = useStationDistances();

  const comparisons = useMemo<Comparison[]>(() => {
    if (!Number.isFinite(distanceKm) || distanceKm < 0 || vehicles.length === 0) return [];

    const result: Comparison[] = [];

    for (const vehicle of vehicles) {
      for (const vehicleFuel of vehicle.fuels) {
        if (!isFuelKey(vehicleFuel.fuelType)) continue;
        const fuel = vehicleFuel.fuelType;
        const stationPrice = station.properties.fuels[fuel];
        if (typeof stationPrice !== 'number' || !Number.isFinite(stationPrice) || stationPrice <= 0) continue;

        const consumption = Number(vehicleFuel.consumption);
        const capacity = Number(vehicleFuel.capacity);
        if (!Number.isFinite(consumption) || consumption <= 0 || !Number.isFinite(capacity) || capacity <= 0) continue;

        const configuredCapacityUnit = capacityUnit(fuel);
        const targetPriceUnit = expectedPriceQuantityUnit(fuel, station.properties.source);
        const unitMismatch = configuredCapacityUnit !== targetPriceUnit;
        const roundTripKm = distanceKm * 2;
        const oneWayFuelNeeded = (distanceKm / 100) * consumption;
        const targetReachable = oneWayFuelNeeded <= capacity + Number.EPSILON;
        const targetTripCost = unitMismatch
          ? 0
          : (roundTripKm / 100) * consumption * stationPrice;

        let bestReference:
          | {
              station: FuelStationFeature;
              price: number;
              distanceKm: number;
              tripCost: number;
              effectiveFullFillCost: number;
              routed: boolean;
            }
          | null = null;

        if (!unitMismatch) {
          for (const candidate of allStations) {
            if (candidate.properties.id === station.properties.id) continue;
            const candidateDistance = stationDistances.get(candidate.properties.id);
            if (
              candidateDistance == null ||
              !Number.isFinite(candidateDistance) ||
              candidateDistance < 0 ||
              candidateDistance > COMPARISON_RADIUS_KM
            ) {
              continue;
            }

            const candidatePrice = candidate.properties.fuels[fuel];
            if (typeof candidatePrice !== 'number' || !Number.isFinite(candidatePrice) || candidatePrice <= 0) continue;
            if (expectedPriceQuantityUnit(fuel, candidate.properties.source) !== configuredCapacityUnit) continue;

            const candidateOneWayFuelNeeded = (candidateDistance / 100) * consumption;
            if (candidateOneWayFuelNeeded > capacity + Number.EPSILON) continue;

            const candidateTripCost = (candidateDistance * 2 / 100) * consumption * candidatePrice;
            const effectiveFullFillCost = candidatePrice * capacity + candidateTripCost;

            if (!bestReference || effectiveFullFillCost < bestReference.effectiveFullFillCost) {
              bestReference = {
                station: candidate,
                price: candidatePrice,
                distanceKm: candidateDistance,
                tripCost: candidateTripCost,
                effectiveFullFillCost,
                routed: routedStationIds.has(candidate.properties.id),
              };
            }
          }
        }

        const referencePrice = bestReference?.price ?? null;
        const referenceTripCost = bestReference?.tripCost ?? null;
        const unitPriceSaving = referencePrice == null ? 0 : referencePrice - stationPrice;
        const grossFuelSaving = referencePrice == null ? 0 : unitPriceSaving * capacity;
        const extraTripCost = referenceTripCost == null ? 0 : targetTripCost - referenceTripCost;
        const netSaving = referencePrice == null ? 0 : grossFuelSaving - extraTripCost;

        let breakEvenFill: number | null = null;
        if (referencePrice != null && unitPriceSaving > 0) {
          // Only extra travel has to be recovered. If this station is no farther
          // (or actually closer) than the best alternative, any positive amount
          // bought at the lower price is already beneficial.
          breakEvenFill = extraTripCost <= 0 ? 0 : extraTripCost / unitPriceSaving;
        }

        result.push({
          key: `${vehicle.id ?? vehicle.name}:${fuel}`,
          vehicleName: vehicle.name,
          fuel,
          capacity,
          capacityUnit: configuredCapacityUnit,
          stationPrice,
          roundTripKm,
          targetTripCost,
          targetReachable,
          referenceStationName: bestReference ? displayStationName(bestReference.station) : null,
          referencePrice,
          referenceDistanceKm: bestReference?.distanceKm ?? null,
          referenceTripCost,
          grossFuelSaving,
          extraTripCost,
          netSaving,
          breakEvenFill,
          breakEvenExceedsCapacity: breakEvenFill != null && breakEvenFill > capacity,
          unitMismatch,
          fullyRouted: distanceRouted && (bestReference?.routed ?? false),
        });
      }
    }

    return result;
  }, [allStations, distanceKm, distanceRouted, routedStationIds, station, stationDistances, vehicles]);

  if (comparisons.length === 0) return null;

  return (
    <View className="gap-sm">
      <Text style={{ color: colors.label }} className="text-footnote font-semibold uppercase tracking-wide">
        {t('settings.drive_cost_title')}
      </Text>

      {comparisons.map((comparison) => {
        const hasReference = comparison.referencePrice !== null;
        const comparable = hasReference && !comparison.unitMismatch && comparison.targetReachable;
        const worthIt = comparable && comparison.netSaving > MONEY_EPSILON;
        const notWorthIt = comparable && comparison.netSaving < -MONEY_EPSILON;
        const verdictColor = worthIt
          ? colors.worthItText
          : notWorthIt
            ? colors.notWorthText
            : colors.secondaryLabel;
        const verdictBackground = worthIt
          ? colors.worthItBg
          : notWorthIt
            ? colors.notWorthBg
            : colors.groupedBackground;

        return (
          <GlassBox key={comparison.key} component="card" className="rounded-md p-md">
            <View className="flex-row items-start justify-between gap-sm">
              <View className="flex-1">
                <Text style={{ color: colors.label }} className="text-body font-semibold">
                  {comparison.vehicleName}
                </Text>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
                  {fuelLabel(comparison.fuel)} · {t('settings.worth_round_trip', { distance: formatDistance(comparison.roundTripKm) })}
                </Text>
              </View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
                {comparison.stationPrice.toFixed(3)}{fuelUnit(comparison.fuel, station.properties.source)}
              </Text>
            </View>

            {comparison.unitMismatch ? (
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote mt-sm">
                {t('settings.worth_unit_mismatch')}
              </Text>
            ) : !comparison.targetReachable ? (
              <Text style={{ color: colors.notWorthText }} className="text-footnote mt-sm font-semibold">
                {t('settings.worth_out_of_range')}
              </Text>
            ) : !hasReference ? (
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote mt-sm">
                {t('settings.worth_no_comparison', { radius: COMPARISON_RADIUS_KM })}
              </Text>
            ) : (
              <>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote mt-sm">
                  {t('settings.worth_reference', {
                    station: comparison.referenceStationName,
                    price: comparison.referencePrice?.toFixed(3),
                    distance: comparison.referenceDistanceKm == null ? '—' : formatDistance(comparison.referenceDistanceKm),
                  })}
                </Text>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote mt-xs">
                  {comparison.grossFuelSaving >= 0
                    ? t('settings.worth_full_tank_saving', { saving: comparison.grossFuelSaving.toFixed(2) })
                    : t('settings.worth_full_tank_extra', { cost: Math.abs(comparison.grossFuelSaving).toFixed(2) })}
                </Text>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote mt-xs">
                  {comparison.extraTripCost >= 0
                    ? t('settings.worth_extra_trip_cost', { cost: comparison.extraTripCost.toFixed(2) })
                    : t('settings.worth_trip_cost_saved', { cost: Math.abs(comparison.extraTripCost).toFixed(2) })}
                </Text>

                {comparison.breakEvenFill !== null && (
                  comparison.breakEvenExceedsCapacity ? (
                    <Text style={{ color: colors.notWorthText }} className="text-footnote mt-xs">
                      {t('settings.worth_break_even_over_capacity')}
                    </Text>
                  ) : (
                    <Text style={{ color: colors.secondaryLabel }} className="text-footnote mt-xs">
                      {t('settings.worth_break_even_fill', {
                        amount: comparison.breakEvenFill.toFixed(1),
                        unit: comparison.capacityUnit,
                      })}
                    </Text>
                  )
                )}

                <View style={{ backgroundColor: verdictBackground }} className="rounded-sm px-sm py-xs mt-sm">
                  <Text style={{ color: verdictColor }} className="text-footnote font-semibold">
                    {worthIt
                      ? t('settings.worth_net_saved', { amount: comparison.netSaving.toFixed(2) })
                      : notWorthIt
                        ? t('settings.worth_net_loss', { amount: Math.abs(comparison.netSaving).toFixed(2) })
                        : t('settings.worth_net_even')}
                  </Text>
                </View>
              </>
            )}

            {!comparison.fullyRouted && (
              <Text style={{ color: colors.tertiaryLabel }} className="text-caption2 mt-sm">
                {t('settings.worth_estimated_distance')}
              </Text>
            )}
            {hasReference && !comparison.unitMismatch && comparison.targetReachable && (
              <Text style={{ color: colors.tertiaryLabel }} className="text-caption2 mt-xs">
                {t('settings.worth_full_tank_assumption')}
              </Text>
            )}
          </GlassBox>
        );
      })}
    </View>
  );
}
