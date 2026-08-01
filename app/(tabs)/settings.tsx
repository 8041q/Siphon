import { useCallback, useEffect, useRef, useState } from 'react';
import { Appearance, Linking, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { useTranslation } from 'react-i18next';

import { client, useUI } from '../../src/hooks/useApp';
import { useAppUpdate, getUpdateUrl } from '../../src/hooks/useAppUpdate';
import { useUserLocationMarker } from '../../src/hooks/useUserLocationMarker';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useEvConfig } from '../../src/hooks/useEvConfig';
import { Button } from '../../src/components/ui/button';
import { ListItem } from '../../src/components/ui/list-item';
import { LanguageSheet, LanguageSheetHandle } from '../../src/components/LanguageSheet';
import { LocationMarkerSheet, LocationMarkerSheetHandle } from '../../src/components/LocationMarkerSheet';
import { VehicleSheet, VehicleSheetHandle } from '../../src/components/VehicleSheet';
import { EvBreakevenSheet, EvBreakevenSheetHandle } from '../../src/components/EvBreakevenSheet';
import { fuelLabel } from '../../src/utils/fuelNames';
import { evBreakeven, consumptionUnit, capacityUnit } from '../../src/utils/vehicles';
import type { Vehicle } from '../../src/utils/vehicles';

type ThemePref = 'system' | 'light' | 'dark';

const LANGUAGE_KEY = 'siphon:language';
const THEME_STORAGE_KEY = 'siphon:theme';

export default function SettingsScreen() {
  const { t, i18n: i18nInstance } = useTranslation();
  const { historyEnabled, setHistoryEnabled } = useUI();
  const { updateAvailable, latestVersion, installedVersion, checking, check } = useAppUpdate();
  const [themePref, setThemePref] = useState<ThemePref>('system');
  const [currentLang, setCurrentLang] = useState(i18nInstance.language);
  const languageSheetRef = useRef<LanguageSheetHandle>(null);
  const locationMarkerSheetRef = useRef<LocationMarkerSheetHandle>(null);
  const vehicleSheetRef = useRef<VehicleSheetHandle>(null);
  const evSheetRef = useRef<EvBreakevenSheetHandle>(null);

  const { vehicles, addVehicle, updateVehicle, removeVehicle } = useVehicles();
  const { config: evConfig, setEvConfig } = useEvConfig();
  const evResult = evBreakeven(evConfig);

  const handleDownloadUpdate = () => {
    Linking.openURL(getUpdateUrl()).catch(() => {});
  };

  const persistLanguage = useCallback(async (lng: string) => {
    await i18nInstance.changeLanguage(lng);
    setCurrentLang(lng);
    await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  }, [i18nInstance]);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setThemePref(val);
      }
    });
    AsyncStorage.getItem(LANGUAGE_KEY).then((val) => {
      if (val === 'en' || val === 'pt' || val === 'es' || val === 'fr' || val === 'de') {
        i18nInstance.changeLanguage(val);
        setCurrentLang(val);
      }
    });
  }, [i18nInstance]);

  const handleThemeChange = (pref: ThemePref) => {
    setThemePref(pref);
    let scheme: 'light' | 'dark';
    if (pref === 'system') {
      scheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    } else {
      scheme = pref;
    }
    nativewindColorScheme.set(scheme);
    setBackgroundColorAsync(scheme === 'dark' ? '#1C1C1E' : '#FFFFFF');
    AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
  };

  const handleToggleHistory = async (value: boolean) => {
    if (!value) {
      try {
        await client.clearHistoryCache();
      } catch {}
    }
    setHistoryEnabled(value);
  };

  const handleSaveVehicle = (data: Omit<Vehicle, 'id'>, id?: string) => {
    if (id) updateVehicle({ ...data, id });
    else addVehicle(data);
  };

  const langLabel = t(`settings.${currentLang}`, { defaultValue: currentLang });
  const { marker: currentMarker } = useUserLocationMarker();
  const markerLabel = currentMarker.type === 'icon'
    ? currentMarker.value.replace('_', ' ')
    : currentMarker.type === 'svg'
      ? currentMarker.value
      : t('settings.marker_custom_image');

  const themeOptions: { label: string; value: ThemePref }[] = [
    { label: t('settings.theme_system'), value: 'system' },
    { label: t('settings.theme_light'), value: 'light' },
    { label: t('settings.theme_dark'), value: 'dark' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-lg pb-xl">

        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.appearance')}
          </Text>
          {themeOptions.map((option) => (
            <View key={option.value}>
              <ListItem
                onPress={() => handleThemeChange(option.value)}
                trailing={themePref === option.value ? '✓' : undefined}
              >
                {option.label}
              </ListItem>
              {option.value !== themeOptions[themeOptions.length - 1].value && (
                <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
              )}
            </View>
          ))}
        </View>

        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.language')}
          </Text>
          <ListItem onPress={() => languageSheetRef.current?.present()} trailing={langLabel}>
            {t('settings.language')}
          </ListItem>
        </View>

        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.location_marker')}
          </Text>
          <ListItem onPress={() => locationMarkerSheetRef.current?.present()} trailing={markerLabel}>
            {t('settings.marker_style')}
          </ListItem>
        </View>

        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.my_vehicles')}
          </Text>
          {vehicles.length === 0 ? (
            <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-md">
              {t('settings.no_vehicles')}
            </Text>
          ) : (
            vehicles.map((vehicle, idx) => (
              <View key={vehicle.id}>
                <ListItem
                  onPress={() => vehicleSheetRef.current?.present(vehicle)}
                  trailing={
                    <View>
                      {vehicle.fuels.map((f) => (
                        <Text
                          key={f.fuelType}
                          className="text-body text-secondary-label dark:text-secondary-label-dark text-right"
                        >
                          {fuelLabel(f.fuelType)} · {f.consumption} {consumptionUnit(f.fuelType)} · {f.capacity} {capacityUnit(f.fuelType)}
                        </Text>
                      ))}
                    </View>
                  }
                >
                  {vehicle.name}
                </ListItem>
                {idx < vehicles.length - 1 && (
                  <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
                )}
              </View>
            ))
          )}
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem onPress={() => vehicleSheetRef.current?.present(null)} trailing="+">
            {t('settings.add_vehicle')}
          </ListItem>
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-md pt-xs">
            {t('settings.vehicles_caption')}
          </Text>
        </View>

        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.ev_vs_gas')}
          </Text>
          <ListItem
            onPress={() => evSheetRef.current?.present()}
            trailing={
              evResult.breakEvenYear !== null
                ? t('settings.ev_break_even_short', { years: evResult.breakEvenYear })
                : t('settings.ev_no_break_even_short')
            }
          >
            {t('settings.ev_vs_gas')}
          </ListItem>
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-md pt-xs">
            {t('settings.ev_caption')}
          </Text>
        </View>

        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.price_history')}
          </Text>
          <View className="flex-row items-center justify-between px-lg py-md">
            <Text className="text-callout text-label dark:text-label-dark flex-1 mr-2">
              {t('settings.save_history')}
            </Text>
            <Switch value={historyEnabled} onValueChange={handleToggleHistory} />
          </View>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-md pt-xs">
            {t('settings.save_history_caption')}
          </Text>
        </View>

        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.updates')}
          </Text>
          <ListItem
            trailing={
              checking
                ? t('settings.checking')
                : updateAvailable
                  ? t('settings.update_available_version', { version: latestVersion })
                  : t('settings.up_to_date')
            }
          >
            {t('settings.update_status')}
          </ListItem>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem onPress={() => check(true)}>{t('settings.check_for_updates')}</ListItem>
          {updateAvailable && (
            <>
              <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
              <View className="px-lg py-md">
                <Button onPress={handleDownloadUpdate}>{t('settings.download_update')}</Button>
              </View>
            </>
          )}
        </View>

        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.about')}
          </Text>
          <ListItem trailing="Siphon">{t('settings.app_name')}</ListItem>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem trailing="SiphonAPI">{t('settings.data_source')}</ListItem>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem trailing={installedVersion}>{t('settings.version')}</ListItem>
        </View>
      </ScrollView>

      <LanguageSheet
        ref={languageSheetRef}
        currentLang={currentLang}
        onSelectLanguage={persistLanguage}
        onDismiss={() => {}}
      />
      <LocationMarkerSheet
        ref={locationMarkerSheetRef}
      />
      <VehicleSheet
        ref={vehicleSheetRef}
        onSave={handleSaveVehicle}
        onRemove={removeVehicle}
      />
      <EvBreakevenSheet
        ref={evSheetRef}
        config={evConfig}
        onSave={setEvConfig}
      />
    </SafeAreaView>
  );
}
