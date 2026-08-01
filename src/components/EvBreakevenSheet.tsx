import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { Field } from './ui/field';
import {
  parseDecimal,
  inRange,
  evBreakeven,
  EV_RATE_MIN,
  EV_RATE_MAX,
  GAS_PRICE_MIN,
  GAS_PRICE_MAX,
  EV_PRICE_MIN,
  EV_PRICE_MAX,
  PETROL_PRICE_MIN,
  PETROL_PRICE_MAX,
  ANNUAL_KM_MIN,
  ANNUAL_KM_MAX,
  BATTERY_REPLACEMENT_COST,
} from '../utils/vehicles';
import type { EvConfig } from '../utils/vehicles';

interface EvBreakevenSheetProps {
  config: EvConfig;
  onSave: (config: EvConfig) => void;
}

export type EvBreakevenSheetHandle = { present: () => void };

const FIELDS: { key: keyof EvConfig; min: number; max: number }[] = [
  { key: 'evPrice', min: EV_PRICE_MIN, max: EV_PRICE_MAX },
  { key: 'petrolPrice', min: PETROL_PRICE_MIN, max: PETROL_PRICE_MAX },
  { key: 'annualKm', min: ANNUAL_KM_MIN, max: ANNUAL_KM_MAX },
  { key: 'gasPrice', min: GAS_PRICE_MIN, max: GAS_PRICE_MAX },
  { key: 'electricityRate', min: EV_RATE_MIN, max: EV_RATE_MAX },
];

const LABEL_KEYS: Record<keyof EvConfig, string> = {
  evPrice: 'settings.ev_price',
  petrolPrice: 'settings.ev_petrol_price',
  annualKm: 'settings.ev_annual_km',
  gasPrice: 'settings.ev_gas_price',
  electricityRate: 'settings.ev_electricity_rate',
};

export const EvBreakevenSheet = forwardRef<EvBreakevenSheetHandle, EvBreakevenSheetProps>(
  function EvBreakevenSheet({ config, onSave }, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['90%'], []);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [values, setValues] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const configRef = useRef(config);
    configRef.current = config;

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          const next: Record<string, string> = {};
          for (const f of FIELDS) {
            next[f.key] = String(configRef.current[f.key]);
          }
          setValues(next);
          setTouched({});
          bottomSheetRef.current?.present();
        },
      }),
      []
    );

    const parsed = useMemo(() => {
      const out = {} as Record<keyof EvConfig, number | null>;
      for (const f of FIELDS) {
        out[f.key] = parseDecimal(values[f.key] ?? '');
      }
      return out;
    }, [values]);

    const errors = useMemo(() => {
      const errs: Record<string, string | null> = {};
      for (const f of FIELDS) {
        const n = parsed[f.key];
        if (n === null) {
          errs[f.key] = (values[f.key] ?? '').trim() === '' ? t('settings.error_required') : t('settings.error_invalid_number');
        } else if (!inRange(n, f.min, f.max)) {
          errs[f.key] = t('settings.error_range', { min: f.min, max: f.max });
        } else {
          errs[f.key] = null;
        }
      }
      return errs;
    }, [parsed, values, t]);

    const valid = useMemo(() => FIELDS.every((f) => parsed[f.key] !== null && inRange(parsed[f.key] as number, f.min, f.max)), [parsed]);

    const result = useMemo(() => {
      if (!valid) return null;
      const cfg = {} as EvConfig;
      for (const f of FIELDS) {
        cfg[f.key] = parsed[f.key] as number;
      }
      return evBreakeven(cfg);
    }, [valid, parsed]);

    // Live apply: every valid field is saved the moment it's typed. Invalid or
    // untouched fields keep their previously saved value.
    useEffect(() => {
      const current = configRef.current;
      const next = { ...current };
      let changed = false;
      for (const f of FIELDS) {
        const n = parsed[f.key];
        if (n !== null && inRange(n, f.min, f.max) && current[f.key] !== n) {
          next[f.key] = n;
          changed = true;
        }
      }
      if (changed) onSave(next);
    }, [parsed, onSave]);

    return (
        <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        handleStyle={{ marginVertical: 8 }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? 'rgba(235, 235, 245, 0.5)' : 'rgba(60, 60, 67, 0.3)',
          width: 40,
          height: 5,
          borderRadius: 3,
          alignSelf: 'center',
          marginVertical: 8,
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <Text className="text-title2 font-semibold text-label dark:text-label-dark mb-lg">
            {t('settings.ev_title')}
          </Text>
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark mb-lg">
            {t('settings.ev_caption')}
          </Text>

          <View className="gap-md">
            {FIELDS.map((f) => (
              <Field
                key={f.key}
                label={t(LABEL_KEYS[f.key])}
                value={values[f.key] ?? ''}
                onChangeText={(text) => {
                  setValues((prev) => ({ ...prev, [f.key]: text }));
                  setTouched((prev) => ({ ...prev, [f.key]: true }));
                }}
                keyboardType="decimal-pad"
                error={touched[f.key] ? errors[f.key] : null}
              />
            ))}
          </View>

          {result && (
            <View className="bg-grouped-background dark:bg-grouped-background-dark rounded-md p-md mt-lg gap-xs">
              <Text className="text-footnote text-label dark:text-label-dark font-semibold uppercase tracking-wide mt-xs">
                {t('settings.ev_per_year_title')}
              </Text>
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{t('settings.ev_annual_cost_ev')}</Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{result.evRunningPerYear.toFixed(0)} €</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{t('settings.ev_annual_cost_gas')}</Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{result.petrolRunningPerYear.toFixed(0)} €</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{t('settings.ev_maintenance')}</Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">~{result.maintenancePerYear.toFixed(0)} €</Text>
              </View>
              <View className="h-px bg-separator dark:bg-separator-dark my-xs" />
              <Text className="text-footnote text-label dark:text-label-dark font-semibold uppercase tracking-wide mt-xs">
                {t('settings.ev_once_title')}
              </Text>
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
                  {t('settings.ev_battery_replacement_once', { year: result.batteryEndOfServiceYear })}
                </Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{BATTERY_REPLACEMENT_COST.toFixed(0)} €</Text>
              </View>
              <View className="h-px bg-separator dark:bg-separator-dark my-xs" />
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
                  {t('settings.ev_total_ev', { years: result.batteryEndOfServiceYear })}
                </Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{result.evTotal(result.batteryEndOfServiceYear).toFixed(0)} €</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">
                  {t('settings.ev_total_petrol', { years: result.batteryEndOfServiceYear })}
                </Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{result.petrolTotal(result.batteryEndOfServiceYear).toFixed(0)} €</Text>
              </View>
              {result.breakEvenYear !== null ? (
                <Text className="text-callout font-semibold text-label dark:text-label-dark mt-sm">
                  {t('settings.ev_becomes_cheaper', { year: result.breakEvenYear })}
                </Text>
              ) : (
                <Text className="text-callout font-semibold text-destructive dark:text-destructive-dark mt-sm">
                  {t('settings.ev_no_break_even')}
                </Text>
              )}
              <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark mt-xs">
                {t('settings.ev_break_even_hint')}
              </Text>
              <View className="h-px bg-separator dark:bg-separator-dark my-xs" />
              <Text className="text-footnote text-label dark:text-label-dark font-semibold uppercase tracking-wide mt-xs">
                {t('settings.ev_co2_title')}
              </Text>
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{t('settings.ev_co2_gas')}</Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{result.annualGasCo2.toFixed(0)} kg</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{t('settings.ev_co2_ev')}</Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{result.annualEvCo2.toFixed(0)} kg</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{t('settings.ev_co2_battery')}</Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{result.batteryCo2.toFixed(0)} kg</Text>
              </View>
              <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark mt-xs">
                {t('settings.ev_battery_note')}
              </Text>
            </View>
          )}

          {result && (
            <View className="mt-lg gap-xs">
              <Text className="text-footnote text-label dark:text-label-dark font-semibold uppercase tracking-wide">
                {t('settings.ev_how_to_read')}
              </Text>
              <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark">
                {t('settings.ev_help_ev')}
              </Text>
              <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark">
                {t('settings.ev_help_gas')}
              </Text>
              <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark">
                {t('settings.ev_help_battery')}
              </Text>
              <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark">
                {t('settings.ev_help_break_even')}
              </Text>
              <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark">
                {t('settings.ev_help_co2')}
              </Text>
            </View>
          )}

          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark text-center mt-xl">
            {t('settings.ev_auto_save')}
          </Text>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
