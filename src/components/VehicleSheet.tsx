import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';

import { Field } from './ui/field';
import { Chip } from './ui/chip';
import { SheetBackground } from './ui/SheetBackground';
import { fuelLabel } from '../utils/fuelNames';
import {
  VEHICLE_FUEL_KEYS,
  parseDecimal,
  inRange,
  isVehicleFormValid,
  isElectricFuel,
  consumptionUnit,
  capacityUnit,
  capacityRange,
  NAME_MAX_LENGTH,
  MAX_FUELS,
  CONSUMPTION_MIN,
  CONSUMPTION_MAX,
} from '../utils/vehicles';
import type { Vehicle } from '../utils/vehicles';

interface VehicleSheetProps {
  onSave: (v: Omit<Vehicle, 'id'>, id?: string) => void;
  onRemove: (id: string) => void;
}

export type VehicleSheetHandle = { present: (vehicle: Vehicle | null) => void };

interface FuelInput {
  fuelType: string;
  consumption: string;
  capacity: string;
}

function defaultFuels(): FuelInput[] {
  return [{ fuelType: VEHICLE_FUEL_KEYS[0], consumption: '', capacity: '' }];
}

export const VehicleSheet = forwardRef<VehicleSheetHandle, VehicleSheetProps>(
  function VehicleSheet({ onSave, onRemove }, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['80%'], []);
    const { colors } = useThemeTokens();

    const [editing, setEditing] = useState<Vehicle | null>(null);
    const [name, setName] = useState('');
    const [fuels, setFuels] = useState<FuelInput[]>(defaultFuels);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    useImperativeHandle(
      ref,
      () => ({
        present: (v: Vehicle | null) => {
          setEditing(v);
          setName(v?.name ?? '');
          setFuels(
            v?.fuels?.length
              ? v.fuels.map((f) => ({
                  fuelType: f.fuelType,
                  consumption: String(f.consumption),
                  capacity: String(f.capacity),
                }))
              : defaultFuels()
          );
          setTouched({});
          bottomSheetRef.current?.present();
        },
      }),
      []
    );

    const nameError = useMemo(() => {
      const trimmed = name.trim();
      if (trimmed.length === 0) return t('settings.error_required');
      if (trimmed.length > NAME_MAX_LENGTH) return t('settings.error_name_too_long', { max: NAME_MAX_LENGTH });
      return null;
    }, [name, t]);

    const consumptionError = useCallback(
      (fuel: FuelInput): string | null => {
        const n = parseDecimal(fuel.consumption);
        if (n === null) {
          return fuel.consumption.trim() === '' ? t('settings.error_required') : t('settings.error_invalid_number');
        }
        if (!inRange(n, CONSUMPTION_MIN, CONSUMPTION_MAX)) {
          return t('settings.error_range', { min: CONSUMPTION_MIN, max: CONSUMPTION_MAX });
        }
        return null;
      },
      [t]
    );

    const capacityError = useCallback(
      (fuel: FuelInput): string | null => {
        const n = parseDecimal(fuel.capacity);
        if (n === null) {
          return fuel.capacity.trim() === '' ? t('settings.error_required') : t('settings.error_invalid_number');
        }
        const range = capacityRange(fuel.fuelType);
        if (!inRange(n, range.min, range.max)) {
          return t('settings.error_range', { min: range.min, max: range.max });
        }
        return null;
      },
      [t]
    );

    const hasLiquid = fuels.some((f) => !isElectricFuel(f.fuelType));

    const valid = isVehicleFormValid({ name, fuels });

    const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

    const toggleFuel = useCallback(
      (key: string) => {
        Haptics.selectionAsync();
        setFuels((prev) => {
          const exists = prev.some((f) => f.fuelType === key);
          if (exists) {
            if (prev.length <= 1) return prev;
            return prev.filter((f) => f.fuelType !== key);
          }
          if (prev.length >= MAX_FUELS) return prev;
          return [...prev, { fuelType: key, consumption: '', capacity: '' }];
        });
      },
      [],
    );

    const updateFuelConsumption = useCallback((key: string, text: string) => {
      setFuels((prev) => prev.map((f) => (f.fuelType === key ? { ...f, consumption: text } : f)));
      setTouched((prev) => ({ ...prev, [`fuel:${key}`]: true }));
    }, []);

    const updateFuelCapacity = useCallback((key: string, text: string) => {
      setFuels((prev) => prev.map((f) => (f.fuelType === key ? { ...f, capacity: text } : f)));
      setTouched((prev) => ({ ...prev, [`fuel:${key}`]: true }));
    }, []);

    const consumptionPlaceholder = (fuel: FuelInput) => {
      if (isElectricFuel(fuel.fuelType)) return t('settings.vehicle_consumption_placeholder_ev');
      if (fuel.fuelType === 'lpg') return t('settings.vehicle_consumption_placeholder_lpg');
      return t('settings.vehicle_consumption_placeholder');
    };

    const capacityPlaceholder = (fuel: FuelInput) =>
      isElectricFuel(fuel.fuelType)
        ? t('settings.vehicle_range_placeholder')
        : t('settings.vehicle_tank_placeholder');

    const capacityLabel = (fuel: FuelInput) =>
      isElectricFuel(fuel.fuelType)
        ? `${t('settings.vehicle_range')} (${capacityUnit(fuel.fuelType)})`
        : `${t('settings.vehicle_tank')} (${capacityUnit(fuel.fuelType)})`;

    const handleSave = useCallback(() => {
      if (!valid) {
        const nextTouched: Record<string, boolean> = { name: true };
        for (const f of fuels) {
          nextTouched[`fuel:${f.fuelType}`] = true;
          nextTouched[`cap:${f.fuelType}`] = true;
        }
        setTouched(nextTouched);
        return;
      }
      const ordered = [...fuels].sort(
        (a, b) => VEHICLE_FUEL_KEYS.indexOf(a.fuelType as (typeof VEHICLE_FUEL_KEYS)[number]) - VEHICLE_FUEL_KEYS.indexOf(b.fuelType as (typeof VEHICLE_FUEL_KEYS)[number])
      );
      onSave(
        {
          name: name.trim(),
          fuels: ordered.map((f) => ({
            fuelType: f.fuelType,
            consumption: parseDecimal(f.consumption) as number,
            capacity: parseDecimal(f.capacity) as number,
          })),
        },
        editing?.id
      );
      bottomSheetRef.current?.dismiss();
    }, [valid, fuels, name, editing, onSave]);

    const handleRemove = useCallback(() => {
      if (!editing) return;
      onRemove(editing.id);
      bottomSheetRef.current?.dismiss();
    }, [editing, onRemove]);

    const chipText = (selected: boolean) =>
      selected ? { color: colors.labelOnTint } : { color: colors.label };

    const isEdit = editing !== null;

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
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundComponent={SheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ color: colors.label }} className="text-title2 font-semibold mb-lg">
            {isEdit ? t('settings.vehicle_edit_title') : t('settings.vehicle_new_title')}
          </Text>

          <View className="gap-md">
            <Field
              label={t('settings.vehicle_name')}
              value={name}
              onChangeText={(text) => {
                setName(text);
                markTouched('name');
              }}
              placeholder={t('settings.vehicle_name_placeholder')}
              error={touched.name ? nameError : null}
            />

            <View>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
                {t('settings.vehicle_fuel')}
              </Text>
              <View className="flex-row flex-wrap gap-sm">
                {VEHICLE_FUEL_KEYS.map((key) => {
                  const selected = fuels.some((f) => f.fuelType === key);
                  const atMax = fuels.length >= MAX_FUELS && !selected;
                  return (
                    <Chip
                      key={key}
                      selected={selected}
                      onPress={() => toggleFuel(key)}
                      disabled={atMax}
                      className={`px-3.5 py-1.5 rounded-full ${atMax ? 'opacity-40' : ''}`}
                    >
                      <Text style={chipText(selected)} className="text-caption-1 font-semibold">{fuelLabel(key)}</Text>
                    </Chip>
                  );
                })}
              </View>
              {fuels.length >= MAX_FUELS && (
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote mt-xs">
                  {t('settings.vehicle_max_fuels')}
                </Text>
              )}
            </View>

            {fuels.map((fuel) => (
              <View key={fuel.fuelType} className="gap-md">
                <Field
                  label={t('settings.vehicle_consumption_fuel', {
                    fuel: fuelLabel(fuel.fuelType),
                    unit: consumptionUnit(fuel.fuelType),
                  })}
                  value={fuel.consumption}
                  onChangeText={(text) => updateFuelConsumption(fuel.fuelType, text)}
                  placeholder={consumptionPlaceholder(fuel)}
                  keyboardType="decimal-pad"
                  error={touched[`fuel:${fuel.fuelType}`] ? consumptionError(fuel) : null}
                />
                <Field
                  label={capacityLabel(fuel)}
                  value={fuel.capacity}
                  onChangeText={(text) => updateFuelCapacity(fuel.fuelType, text)}
                  placeholder={capacityPlaceholder(fuel)}
                  keyboardType="numeric"
                  error={touched[`cap:${fuel.fuelType}`] ? capacityError(fuel) : null}
                />
              </View>
            ))}

            {hasLiquid && (
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
                {t('settings.vehicle_tank_caption')}
              </Text>
            )}
          </View>

          <View className="gap-sm mt-xl">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSave}
              disabled={!valid}
              style={{ backgroundColor: valid ? colors.tint : colors.surface }}
              className="rounded-md py-md items-center"
            >
              <Text style={{ color: valid ? colors.labelOnTint : colors.secondaryLabel }} className="font-semibold text-callout">
                {t('settings.save_vehicle')}
              </Text>
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRemove}
                style={{ borderColor: colors.destructive }}
                className="rounded-md py-md items-center border"
              >
                <Text style={{ color: colors.destructive }} className="font-semibold text-callout">
                  {t('settings.remove_vehicle')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
