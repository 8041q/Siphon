import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useThemeTokens } from '../hooks/useThemeTokens';
import { useBottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import { Field } from './ui/field';
import { GlassBox } from './ui/GlassBox';
import { SheetBackground, SHEET_HANDLE_INDICATOR_STYLE, SHEET_HANDLE_STYLE } from './ui/SheetBackground';
import type { EvConfig } from '../utils/vehicles';

export type EvBreakevenSheetHandle = { present: () => void };

type VehicleLike = {
  id: string;
  name: string;
  fuels: readonly { fuelType: string; consumption: number; capacity: number }[];
};

type ScenarioExtras = {
  ownershipYears: number;
  evConsumption: number;
  iceConsumption: number;
  evMaintenanceYear: number;
  iceMaintenanceYear: number;
  resaleEv: number;
  resaleIce: number;
  batteryReplacementEnabled: boolean;
  batteryReplacementYear: number;
  batteryReplacementCost: number;
};

const STORAGE_KEY = 'siphon:evOwnershipScenario:v2';
const DEFAULTS: ScenarioExtras = {
  ownershipYears: 8,
  evConsumption: 17,
  iceConsumption: 6.5,
  evMaintenanceYear: 0,
  iceMaintenanceYear: 0,
  resaleEv: 0,
  resaleIce: 0,
  batteryReplacementEnabled: false,
  batteryReplacementYear: 10,
  batteryReplacementCost: 8000,
};

function num(value: string, fallback: number): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function ownershipResult(config: EvConfig, extras: ScenarioExtras) {
  const annualKm = Math.max(0, config.annualKm);
  const evEnergyYear = (annualKm / 100) * extras.evConsumption * config.electricityRate;
  const iceEnergyYear = (annualKm / 100) * extras.iceConsumption * config.gasPrice;
  const evAnnual = evEnergyYear + extras.evMaintenanceYear;
  const iceAnnual = iceEnergyYear + extras.iceMaintenanceYear;
  const years = Math.max(1, Math.round(extras.ownershipYears));
  const battery = extras.batteryReplacementEnabled && extras.batteryReplacementYear <= years
    ? extras.batteryReplacementCost
    : 0;
  const evTotal = config.evPrice + evAnnual * years + battery - extras.resaleEv;
  const iceTotal = config.petrolPrice + iceAnnual * years - extras.resaleIce;
  const annualSavings = iceAnnual - evAnnual;
  const purchaseGap = config.evPrice - config.petrolPrice;
  const breakEvenYear = annualSavings > 0
    ? Math.max(0, Math.ceil((purchaseGap + battery) / annualSavings))
    : null;
  const perKmEv = annualKm > 0 ? evAnnual / annualKm : 0;
  const perKmIce = annualKm > 0 ? iceAnnual / annualKm : 0;
  const variableSavingPerKm = (extras.iceConsumption / 100) * config.gasPrice - (extras.evConsumption / 100) * config.electricityRate;
  const maintenanceSaving = extras.iceMaintenanceYear - extras.evMaintenanceYear;
  const ownershipFixedGapPerYear = years > 0 ? (purchaseGap + battery - extras.resaleEv + extras.resaleIce) / years : 0;
  const breakEvenAnnualKm = variableSavingPerKm > 0
    ? Math.max(0, (ownershipFixedGapPerYear - maintenanceSaving) / variableSavingPerKm)
    : null;
  const electricityBreakEven = extras.evConsumption > 0
    ? Math.max(0, (((extras.iceConsumption / 100) * config.gasPrice) + maintenanceSaving / Math.max(1, annualKm)) * 100 / extras.evConsumption)
    : null;
  return { years, evEnergyYear, iceEnergyYear, evAnnual, iceAnnual, evTotal, iceTotal, annualSavings, breakEvenYear, perKmEv, perKmIce, breakEvenAnnualKm, electricityBreakEven };
}

export const EvBreakevenSheet = forwardRef<EvBreakevenSheetHandle, {
  config: EvConfig;
  onSave: (config: EvConfig) => void;
  vehicles?: readonly VehicleLike[];
}>(function EvBreakevenSheet({ config, onSave, vehicles = [] }, ref) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { handleSheetChange, handleSheetDismiss } = useBottomSheetBackHandler(bottomSheetRef);
  const snapPoints = useMemo(() => ['92%'], []);
  const [core, setCore] = useState(config);
  const [extras, setExtras] = useState<ScenarioExtras>(DEFAULTS);

  const evVehicles = useMemo(() => vehicles.filter((v) => v.fuels.some((f) => f.fuelType === 'electric')), [vehicles]);
  const iceVehicles = useMemo(() => vehicles.filter((v) => v.fuels.some((f) => f.fuelType !== 'electric')), [vehicles]);
  const [selectedEvId, setSelectedEvId] = useState<string | null>(null);
  const [selectedIceId, setSelectedIceId] = useState<string | null>(null);

  useEffect(() => { setCore(config); }, [config]);
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Partial<ScenarioExtras>;
        setExtras((prev) => ({ ...prev, ...parsed }));
      } catch {
        void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
      }
    });
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(extras)).catch(() => undefined);
  }, [extras]);

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

  const saveCore = (key: keyof EvConfig, value: string) => {
    const next = { ...core, [key]: num(value, core[key]) };
    setCore(next);
    onSave(next);
  };
  const saveExtra = (key: keyof ScenarioExtras, value: string) => {
    setExtras((prev) => ({ ...prev, [key]: num(value, Number(prev[key])) }));
  };

  const result = useMemo(() => ownershipResult(core, extras), [core, extras]);
  const winner = Math.abs(result.evTotal - result.iceTotal) < 100 ? 'close' : result.evTotal < result.iceTotal ? 'ev' : 'ice';

  const vehicleChip = (vehicle: VehicleLike, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={vehicle.id} onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: selected ? colors.tint : colors.groupedBackground }}>
      <Text style={{ color: selected ? colors.labelOnTint : colors.label }} className="text-footnote font-semibold">{vehicle.name}</Text>
    </TouchableOpacity>
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
      backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundComponent={SheetBackground}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
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
          <Field label={t('settings.ev_price')} value={String(core.evPrice)} onChangeText={(v) => saveCore('evPrice', v)} keyboardType="decimal-pad" />
          <Field label={t('settings.ev_petrol_price')} value={String(core.petrolPrice)} onChangeText={(v) => saveCore('petrolPrice', v)} keyboardType="decimal-pad" />
          <Field label={t('settings.ev_annual_km')} value={String(core.annualKm)} onChangeText={(v) => saveCore('annualKm', v)} keyboardType="decimal-pad" />
          <Field label={t('settings.ev_gas_price')} value={String(core.gasPrice)} onChangeText={(v) => saveCore('gasPrice', v)} keyboardType="decimal-pad" />
          <Field label={t('settings.ev_electricity_rate')} value={String(core.electricityRate)} onChangeText={(v) => saveCore('electricityRate', v)} keyboardType="decimal-pad" />
          <Field label={t('settings.ev_consumption_kwh')} value={String(extras.evConsumption)} onChangeText={(v) => saveExtra('evConsumption', v)} keyboardType="decimal-pad" />
          <Field label={t('settings.ev_consumption_l')} value={String(extras.iceConsumption)} onChangeText={(v) => saveExtra('iceConsumption', v)} keyboardType="decimal-pad" />
          <Field label={t('settings.ev_ownership_years')} value={String(extras.ownershipYears)} onChangeText={(v) => saveExtra('ownershipYears', v)} keyboardType="number-pad" />
          <Field label={t('settings.ev_maintenance_ev')} value={String(extras.evMaintenanceYear)} onChangeText={(v) => saveExtra('evMaintenanceYear', v)} keyboardType="decimal-pad" />
          <Field label={t('settings.ev_maintenance_ice')} value={String(extras.iceMaintenanceYear)} onChangeText={(v) => saveExtra('iceMaintenanceYear', v)} keyboardType="decimal-pad" />
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
