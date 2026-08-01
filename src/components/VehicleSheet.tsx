import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { Field } from './ui/field';
import { fuelLabel } from '../utils/fuelNames';
import {
  VEHICLE_FUEL_KEYS,
  parseDecimal,
  inRange,
  isVehicleFormValid,
  NAME_MAX_LENGTH,
  CONSUMPTION_MIN,
  CONSUMPTION_MAX,
  TANK_MIN,
  TANK_MAX,
} from '../utils/vehicles';
import type { Vehicle } from '../utils/vehicles';

interface VehicleSheetProps {
  onSave: (v: Omit<Vehicle, 'id'>, id?: string) => void;
  onRemove: (id: string) => void;
}

export type VehicleSheetHandle = { present: (vehicle: Vehicle | null) => void };

export const VehicleSheet = forwardRef<VehicleSheetHandle, VehicleSheetProps>(
  function VehicleSheet({ onSave, onRemove }, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['80%'], []);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [editing, setEditing] = useState<Vehicle | null>(null);
    const [name, setName] = useState('');
    const [fuelType, setFuelType] = useState<string>(VEHICLE_FUEL_KEYS[0]);
    const [consumption, setConsumption] = useState('');
    const [tankSize, setTankSize] = useState('');
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    useImperativeHandle(
      ref,
      () => ({
        present: (v: Vehicle | null) => {
          setEditing(v);
          setName(v?.name ?? '');
          setFuelType(v?.fuelType ?? VEHICLE_FUEL_KEYS[0]);
          setConsumption(v ? String(v.consumption) : '');
          setTankSize(v ? String(v.tankSize) : '');
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

    const consumptionNum = parseDecimal(consumption);
    const consumptionError = useMemo(() => {
      if (consumptionNum === null) {
        return consumption.trim() === '' ? t('settings.error_required') : t('settings.error_invalid_number');
      }
      if (!inRange(consumptionNum, CONSUMPTION_MIN, CONSUMPTION_MAX)) {
        return t('settings.error_range', { min: CONSUMPTION_MIN, max: CONSUMPTION_MAX });
      }
      return null;
    }, [consumptionNum, consumption, t]);

    const tankSizeNum = parseDecimal(tankSize);
    const tankSizeError = useMemo(() => {
      if (tankSizeNum === null) {
        return tankSize.trim() === '' ? t('settings.error_required') : t('settings.error_invalid_number');
      }
      if (!inRange(tankSizeNum, TANK_MIN, TANK_MAX)) {
        return t('settings.error_range', { min: TANK_MIN, max: TANK_MAX });
      }
      return null;
    }, [tankSizeNum, tankSize, t]);

    const valid = isVehicleFormValid({ name, fuelType, consumption, tankSize });

    const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

    const handleSave = useCallback(() => {
      if (!valid || consumptionNum === null || tankSizeNum === null) {
        setTouched({ name: true, consumption: true, tankSize: true });
        return;
      }
      onSave(
        { name: name.trim(), fuelType, consumption: consumptionNum, tankSize: tankSizeNum },
        editing?.id
      );
      bottomSheetRef.current?.dismiss();
    }, [valid, consumptionNum, tankSizeNum, name, fuelType, editing, onSave]);

    const handleRemove = useCallback(() => {
      if (!editing) return;
      onRemove(editing.id);
      bottomSheetRef.current?.dismiss();
    }, [editing, onRemove]);

    const chipBg = (selected: boolean) =>
      selected ? 'bg-tint' : 'bg-surface dark:bg-surface-dark';
    const chipText = (selected: boolean) =>
      selected ? 'text-white' : 'text-label dark:text-label-dark';

    const isEdit = editing !== null;

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture
        enableDynamicSizing={false}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? 'rgba(235, 235, 245, 0.5)' : 'rgba(60, 60, 67, 0.3)',
        }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <Text className="text-title2 font-semibold text-label dark:text-label-dark mb-lg">
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
              <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
                {t('settings.vehicle_fuel')}
              </Text>
              <View className="flex-row flex-wrap gap-sm">
                {VEHICLE_FUEL_KEYS.map((key) => {
                  const selected = fuelType === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      onPress={() => setFuelType(key)}
                      className={`px-3.5 py-1.5 rounded-full ${chipBg(selected)}`}
                    >
                      <Text className={`text-caption-1 font-semibold ${chipText(selected)}`}>{fuelLabel(key)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Field
              label={t('settings.vehicle_consumption')}
              value={consumption}
              onChangeText={(text) => {
                setConsumption(text);
                markTouched('consumption');
              }}
              placeholder={t('settings.vehicle_consumption_placeholder')}
              keyboardType="decimal-pad"
              error={touched.consumption ? consumptionError : null}
            />

            <Field
              label={t('settings.vehicle_tank')}
              value={tankSize}
              onChangeText={(text) => {
                setTankSize(text);
                markTouched('tankSize');
              }}
              placeholder={t('settings.vehicle_tank_placeholder')}
              keyboardType="numeric"
              error={touched.tankSize ? tankSizeError : null}
            />
          </View>

          <View className="gap-sm mt-xl">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSave}
              disabled={!valid}
              className={`rounded-md py-md items-center ${valid ? 'bg-tint' : 'bg-surface dark:bg-surface-dark'}`}
            >
              <Text className={`font-semibold text-callout ${valid ? 'text-white' : 'text-secondary-label dark:text-secondary-label-dark'}`}>
                {t('settings.save_vehicle')}
              </Text>
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRemove}
                className="rounded-md py-md items-center border border-destructive dark:border-destructive-dark"
              >
                <Text className="text-destructive dark:text-destructive-dark font-semibold text-callout">
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
