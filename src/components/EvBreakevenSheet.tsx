import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { Field } from './ui/field';
import { parseDecimal, inRange, evBreakeven } from '../utils/vehicles';
import type { EvConfig } from '../utils/vehicles';

interface EvBreakevenSheetProps {
  config: EvConfig;
  onSave: (config: EvConfig) => void;
}

export type EvBreakevenSheetHandle = { present: () => void };

const FIELDS: { key: keyof EvConfig; min: number; max: number }[] = [
  { key: 'electricityRate', min: 0.01, max: 1 },
  { key: 'evConsumption', min: 1, max: 60 },
  { key: 'gasConsumption', min: 1, max: 40 },
  { key: 'gasPrice', min: 0.5, max: 5 },
  { key: 'evPremium', min: 0, max: 200000 },
  { key: 'annualKm', min: 100, max: 200000 },
];

const LABEL_KEYS: Record<keyof EvConfig, string> = {
  electricityRate: 'settings.ev_electricity_rate',
  evConsumption: 'settings.ev_consumption',
  gasConsumption: 'settings.ev_gas_consumption',
  gasPrice: 'settings.ev_gas_price',
  evPremium: 'settings.ev_premium',
  annualKm: 'settings.ev_annual_km',
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

    const handleSave = useCallback(() => {
      if (!valid) {
        const nextTouched: Record<string, boolean> = {};
        for (const f of FIELDS) nextTouched[f.key] = true;
        setTouched(nextTouched);
        return;
      }
      const cfg = {} as EvConfig;
      for (const f of FIELDS) {
        cfg[f.key] = parsed[f.key] as number;
      }
      onSave(cfg);
      bottomSheetRef.current?.dismiss();
    }, [valid, parsed, onSave]);

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
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{t('settings.ev_annual_cost_gas')}</Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{result.annualGasCost.toFixed(0)} €</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{t('settings.ev_annual_cost_ev')}</Text>
                <Text className="text-body font-semibold text-label dark:text-label-dark">{result.annualEvCost.toFixed(0)} €</Text>
              </View>
              <View className="h-px bg-separator dark:bg-separator-dark my-xs" />
              {result.breakEvenYears !== null ? (
                <>
                  <View className="flex-row justify-between">
                    <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{t('settings.ev_annual_saving')}</Text>
                    <Text className="text-body font-semibold text-price-low dark:text-price-low-dark">{result.annualSaving.toFixed(0)} €</Text>
                  </View>
                  <Text className="text-callout font-semibold text-label dark:text-label-dark mt-xs">
                    {t('settings.ev_break_even', { years: result.breakEvenYears.toFixed(1) })}
                  </Text>
                </>
              ) : (
                <Text className="text-callout font-semibold text-destructive dark:text-destructive-dark">
                  {t('settings.ev_no_break_even')}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSave}
            disabled={!valid}
            className={`rounded-md py-md items-center mt-xl ${valid ? 'bg-tint' : 'bg-surface dark:bg-surface-dark'}`}
          >
            <Text className={`font-semibold text-callout ${valid ? 'text-white' : 'text-secondary-label dark:text-secondary-label-dark'}`}>
              {t('common.done')}
            </Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
