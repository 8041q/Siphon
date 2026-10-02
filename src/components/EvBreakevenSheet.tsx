import { useAppearanceLayout } from '../hooks/useAppearanceLayout';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { useBottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import { NumericField } from './ui/NumericField';
import { GlassBox } from './ui/GlassBox';
import { FilterButton } from './ui/FilterButton';
import { SheetBackground } from './ui/SheetBackground';
import { SheetBackdrop } from './ui/SheetBackdrop';
import { SHEET_HANDLE_INDICATOR_STYLE, SHEET_HANDLE_STYLE } from '../theme/layout';
import type { EvConfig } from '../utils/vehicles';
import { DEFAULT_OWNERSHIP_SCENARIO, ownershipResult, restoreOwnershipScenario, type ScenarioExtras } from '../utils/evOwnership';

export type EvBreakevenSheetHandle = { present: () => void };

type VehicleLike = {
  id: string;
  name: string;
  fuels: readonly { fuelType: string; consumption: number; capacity: number }[];
};

const STORAGE_KEY = 'siphon:evOwnershipScenario:v2';

export const EvBreakevenSheet = forwardRef<EvBreakevenSheetHandle, {
  config: EvConfig;
  onSave: (config: EvConfig) => void;
  vehicles?: readonly VehicleLike[];
}>(function EvBreakevenSheet({ config, onSave, vehicles = [] }, ref) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { space } = useAppearanceLayout();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { handleSheetChange, handleSheetDismiss } = useBottomSheetBackHandler(bottomSheetRef);
  const snapPoints = useMemo(() => ['92%'], []);
  const [core, setCore] = useState(config);
  const [extras, setExtras] = useState<ScenarioExtras>(DEFAULT_OWNERSHIP_SCENARIO);
  const [extrasLoaded, setExtrasLoaded] = useState(false);

  const evVehicles = useMemo(() => vehicles.filter((v) => v.fuels.some((f) => f.fuelType === 'electric')), [vehicles]);
  const iceVehicles = useMemo(() => vehicles.filter((v) => v.fuels.some((f) => f.fuelType !== 'electric')), [vehicles]);
  const [selectedEvId, setSelectedEvId] = useState<string | null>(null);
  const [selectedIceId, setSelectedIceId] = useState<string | null>(null);

  useEffect(() => { setCore(config); }, [config]);
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        setExtras(restoreOwnershipScenario(JSON.parse(raw)));
      } catch {
        void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
      }
    }).catch(() => undefined).finally(() => setExtrasLoaded(true));
  }, []);

  useEffect(() => {
    if (!extrasLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(extras)).catch(() => undefined);
  }, [extras, extrasLoaded]);

  useEffect(() => {
    const vehicle = evVehicles.find((v) => v.id === selectedEvId);
    const fuel = vehicle?.fuels.find((f) => f.fuelType === 'electric');
    if (fuel && Number.isFinite(fuel.consumption)) setExtras((prev) => ({ ...prev, evConsumption: fuel.consumption }));
  }, [evVehicles, selectedEvId]);

  useEffect(() => {
    const vehicle = iceVehicles.find((v) => v.id === selectedIceId);
    const fuel = vehicle?.fuels.find((f) => f.fuelType !== 'electric');
    if (fuel && Number.isFinite(fuel.consumption)) setExtras((prev) => ({ ...prev, iceConsumption: fuel.consumption }));
  }, [iceVehicles, selectedIceId]);

  useImperativeHandle(ref, () => ({
    present: () => {
      setCore(config);
      bottomSheetRef.current?.present();
    },
  }), [config]);

  const saveCore = (key: keyof EvConfig, value: number) => {
    const next = { ...core, [key]: value };
    setCore(next);
    onSave(next);
  };
  const saveExtra = (key: keyof ScenarioExtras, value: number) => {
    setExtras((prev) => ({ ...prev, [key]: value }));
  };

  const result = useMemo(() => ownershipResult(core, extras), [core, extras]);
  const winner = Math.abs(result.evTotal - result.iceTotal) < 100 ? 'close' : result.evTotal < result.iceTotal ? 'ev' : 'ice';

  const vehicleChip = (vehicle: VehicleLike, selected: boolean, onPress: () => void) => (
    <FilterButton key={vehicle.id} label={vehicle.name} selected={selected} onPress={onPress} />
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableDynamicSizing={false}
      handleStyle={SHEET_HANDLE_STYLE}
      handleIndicatorStyle={[SHEET_HANDLE_INDICATOR_STYLE, { backgroundColor: colors.handleIndicator }]}
      onChange={handleSheetChange}
      onDismiss={handleSheetDismiss}
      backdropComponent={SheetBackdrop}
      backgroundComponent={SheetBackground}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.lg + insets.bottom }}>
        <Text style={{ color: colors.label }} className="text-title-2 font-semibold mb-xs">{t('settings.ev_title')}</Text>
        <Text style={{ color: colors.secondaryLabel }} className="text-footnote mb-lg">{t('settings.ev_tco_caption')}</Text>

        {(evVehicles.length > 0 || iceVehicles.length > 0) && (
          <View className="gap-sm mb-lg">
            {evVehicles.length > 0 && <>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{t('settings.ev_pick_ev')}</Text>
              <View className="flex-row flex-wrap gap-sm">{evVehicles.map((v) => vehicleChip(v, selectedEvId === v.id, () => setSelectedEvId(v.id)))}</View>
            </>}
            {iceVehicles.length > 0 && <>
              <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{t('settings.ev_pick_ice')}</Text>
              <View className="flex-row flex-wrap gap-sm">{iceVehicles.map((v) => vehicleChip(v, selectedIceId === v.id, () => setSelectedIceId(v.id)))}</View>
            </>}
          </View>
        )}

        <View className="gap-md">
          <NumericField label={t('settings.ev_price')} value={core.evPrice} onChangeValue={(v) => saveCore('evPrice', v)} />
          <NumericField label={t('settings.ev_petrol_price')} value={core.petrolPrice} onChangeValue={(v) => saveCore('petrolPrice', v)} />
          <NumericField label={t('settings.ev_annual_km')} value={core.annualKm} onChangeValue={(v) => saveCore('annualKm', v)} />
          <NumericField label={t('settings.ev_gas_price')} value={core.gasPrice} onChangeValue={(v) => saveCore('gasPrice', v)} />
          <NumericField label={t('settings.ev_electricity_rate')} value={core.electricityRate} onChangeValue={(v) => saveCore('electricityRate', v)} />
          <NumericField label={t('settings.ev_consumption_kwh')} value={extras.evConsumption} onChangeValue={(v) => saveExtra('evConsumption', v)} />
          <NumericField label={t('settings.ev_consumption_l')} value={extras.iceConsumption} onChangeValue={(v) => saveExtra('iceConsumption', v)} />
          <NumericField label={t('settings.ev_ownership_years')} value={extras.ownershipYears} onChangeValue={(v) => saveExtra('ownershipYears', v)} integer />
          <NumericField label={t('settings.ev_maintenance_ev')} value={extras.evMaintenanceYear} onChangeValue={(v) => saveExtra('evMaintenanceYear', v)} />
          <NumericField label={t('settings.ev_maintenance_ice')} value={extras.iceMaintenanceYear} onChangeValue={(v) => saveExtra('iceMaintenanceYear', v)} />
          <NumericField label={t('settings.ev_battery_cost_optional')} value={extras.batteryReplacementCost} onChangeValue={(v) => saveExtra('batteryReplacementCost', v)} />
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{t('settings.ev_battery_cost_hint')}</Text>
        </View>

        <GlassBox component="card" className="rounded-md p-md mt-lg gap-sm">
          <Text style={{ color: colors.label }} className="text-headline font-semibold">{t(`settings.ev_result_${winner}`)}</Text>
          <View className="flex-row justify-between"><Text style={{ color: colors.secondaryLabel }}>{t('settings.ev_cost_100_ev')}</Text><Text style={{ color: colors.label }} className="font-semibold">{(result.perKmEv * 100).toFixed(2)} €</Text></View>
          <View className="flex-row justify-between"><Text style={{ color: colors.secondaryLabel }}>{t('settings.ev_cost_100_ice')}</Text><Text style={{ color: colors.label }} className="font-semibold">{(result.perKmIce * 100).toFixed(2)} €</Text></View>
          <View className="flex-row justify-between"><Text style={{ color: colors.secondaryLabel }}>{t('settings.ev_total_ev', { years: result.years })}</Text><Text style={{ color: colors.label }} className="font-semibold">{result.evTotal.toFixed(0)} €</Text></View>
          <View className="flex-row justify-between"><Text style={{ color: colors.secondaryLabel }}>{t('settings.ev_total_petrol', { years: result.years })}</Text><Text style={{ color: colors.label }} className="font-semibold">{result.iceTotal.toFixed(0)} €</Text></View>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
            {result.breakEvenYear === 0
              ? t('settings.ev_already_cheaper')
              : result.breakEvenYear !== null
                ? t('settings.ev_becomes_cheaper', { year: result.breakEvenYear })
                : t('settings.ev_no_break_even')}
          </Text>
          {result.breakEvenAnnualKm !== null && Number.isFinite(result.breakEvenAnnualKm) && (
            <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{t('settings.ev_break_even_km', { km: Math.round(result.breakEvenAnnualKm) })}</Text>
          )}
          {result.electricityBreakEven !== null && Number.isFinite(result.electricityBreakEven) && (
            <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{t('settings.ev_break_even_electricity', { rate: result.electricityBreakEven.toFixed(2) })}</Text>
          )}
          <Text style={{ color: colors.tertiaryLabel }} className="text-caption-1">{t('settings.ev_method_note')}</Text>
        </GlassBox>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
