import { useCallback, useEffect, useRef, useState } from 'react';
import { Appearance, Linking, ScrollView, Switch, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { useTranslation } from 'react-i18next';

import { client, useUI } from '../../src/hooks/useApp';
import { useSupport } from '../../src/hooks/useSupport';
import { useAppUpdate, getUpdateUrl } from '../../src/hooks/useAppUpdate';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useEvConfig } from '../../src/hooks/useEvConfig';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { useStyleConfig, applyComponentRules } from '../../src/hooks/useStyleConfig';
import { getPalette } from '../../src/theme/palettes';
import { tabBarClearance } from '../../src/theme/layout';
import { Button } from '../../src/components/ui/button';
import { ListItem } from '../../src/components/ui/list-item';
import { LanguageSheet, LanguageSheetHandle } from '../../src/components/LanguageSheet';
import { ThemeSheet, ThemeSheetHandle } from '../../src/components/ThemeSheet';
import { LocationMarkerSheet, LocationMarkerSheetHandle } from '../../src/components/LocationMarkerSheet';
import { VehicleSheet, VehicleSheetHandle } from '../../src/components/VehicleSheet';
import { EvBreakevenSheet, EvBreakevenSheetHandle } from '../../src/components/EvBreakevenSheet';
import { RewardsSheet, RewardsSheetHandle } from '../../src/components/RewardsSheet';
import { DonationSheet, DonationSheetHandle } from '../../src/components/DonationSheet';
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
  const insets = useSafeAreaInsets();
  const [themePref, setThemePref] = useState<ThemePref>('system');
  const [currentLang, setCurrentLang] = useState(i18nInstance.language);
  const languageSheetRef = useRef<LanguageSheetHandle>(null);
  const themeSheetRef = useRef<ThemeSheetHandle>(null);
  const locationMarkerSheetRef = useRef<LocationMarkerSheetHandle>(null);
  const vehicleSheetRef = useRef<VehicleSheetHandle>(null);
  const evSheetRef = useRef<EvBreakevenSheetHandle>(null);
  const rewardsSheetRef = useRef<RewardsSheetHandle>(null);
  const donationSheetRef = useRef<DonationSheetHandle>(null);

  const { watchedCount, paletteId, iconSetId, styleSetId, styleRules, marker: currentMarker } = useSupport();
  const { vehicles, addVehicle, updateVehicle, removeVehicle } = useVehicles();
  const { config: evConfig, setEvConfig } = useEvConfig();
  const evResult = evBreakeven(evConfig);
  const { colors } = useThemeTokens();
  const cardRules = useStyleConfig(styleRules, 'card');
  const cardStyle = applyComponentRules(cardRules, colors.label);

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
    setBackgroundColorAsync(getPalette(paletteId)[scheme].background);
    AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
  };

  const handleToggleHistory = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  const themeLabel = t(`settings.theme_${themePref}`);
  const markerLabel = currentMarker.type === 'icon'
    ? currentMarker.value.replace('_', ' ')
    : currentMarker.type === 'svg'
      ? currentMarker.value
      : t('settings.marker_custom_image');

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg"
        contentContainerStyle={{ paddingBottom: tabBarClearance(insets.bottom) + 16 }}
      >

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.appearance')}
          </Text>
          <ListItem onPress={() => themeSheetRef.current?.present()} trailing={themeLabel}>
            {t('settings.theme')}
          </ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem onPress={() => rewardsSheetRef.current?.present()} trailing={t(`settings.palette_${paletteId}`)}>
            {t('settings.color_palette')}
          </ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem onPress={() => rewardsSheetRef.current?.present()} trailing={t(`settings.iconset_${iconSetId}`)}>
            {t('settings.icon_set')}
          </ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem onPress={() => rewardsSheetRef.current?.present()} trailing={t(`settings.styleset_${styleSetId}`)}>
            {t('settings.style_set')}
          </ListItem>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.language')}
          </Text>
          <ListItem onPress={() => languageSheetRef.current?.present()} trailing={langLabel}>
            {t('settings.language')}
          </ListItem>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.location_marker')}
          </Text>
          <ListItem onPress={() => locationMarkerSheetRef.current?.present()} trailing={markerLabel}>
            {t('settings.marker_style')}
          </ListItem>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.my_vehicles')}
          </Text>
          {vehicles.length === 0 ? (
            <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-md">
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
                          style={{ color: colors.secondaryLabel }}
                          className="text-body text-right"
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
                  <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
                )}
              </View>
            ))
          )}
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem onPress={() => vehicleSheetRef.current?.present(null)} trailing="+">
            {t('settings.add_vehicle')}
          </ListItem>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-md pt-xs">
            {t('settings.vehicles_caption')}
          </Text>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.price_history')}
          </Text>
          <View style={{ backgroundColor: colors.surface }} className="flex-row items-center justify-between px-lg py-md">
            <Text style={{ color: colors.label }} className="text-callout flex-1 mr-2">
              {t('settings.save_history')}
            </Text>
            <Switch value={historyEnabled} onValueChange={handleToggleHistory} />
          </View>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-md pt-xs">
            {t('settings.save_history_caption')}
          </Text>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
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
            {t('settings.ev_vs_gas_sub')}
          </ListItem>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-md pt-xs">
            {t('settings.ev_caption')}
          </Text>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
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
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem onPress={() => check(true)}>{t('settings.check_for_updates')}</ListItem>
          {updateAvailable && (
            <>
              <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
              <View className="px-lg py-md">
                <Button onPress={handleDownloadUpdate}>{t('settings.download_update')}</Button>
              </View>
            </>
          )}
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.support')}
          </Text>
          <ListItem
            onPress={() => rewardsSheetRef.current?.present()}
            trailing={t('settings.support_rewards_trailing', { count: watchedCount })}
          >
            {t('settings.support_rewards')}
          </ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem onPress={() => donationSheetRef.current?.present()}>
            {t('settings.support_donate')}
          </ListItem>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.about')}
          </Text>
          <ListItem trailing="Siphon">{t('settings.app_name')}</ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem trailing="SiphonAPI">{t('settings.data_source')}</ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem trailing={installedVersion}>{t('settings.version')}</ListItem>
        </View>
      </ScrollView>

      <LanguageSheet
        ref={languageSheetRef}
        currentLang={currentLang}
        onSelectLanguage={persistLanguage}
        onDismiss={() => {}}
      />
      <ThemeSheet
        ref={themeSheetRef}
        currentTheme={themePref}
        onSelectTheme={handleThemeChange}
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
      <RewardsSheet ref={rewardsSheetRef} />
      <DonationSheet ref={donationSheetRef} />
    </SafeAreaView>
  );
}
