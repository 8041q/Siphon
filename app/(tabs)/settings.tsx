import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, I18nManager, Linking, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { client, useStationDistances, useUI } from '../../src/hooks/useApp';
import { useAppearanceSupport, useSupport } from '../../src/hooks/useSupport';
import { useAppUpdate } from '../../src/hooks/useAppUpdate';
import { useVehicles } from '../../src/hooks/useVehicles';
import { useEvConfig } from '../../src/hooks/useEvConfig';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { useStyleConfig, applyComponentRules } from '../../src/hooks/useStyleConfig';
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
import { consumptionUnit, capacityUnit } from '../../src/utils/vehicles';
import type { Vehicle } from '../../src/utils/vehicles';
import { MONETIZATION_ENABLED } from '../../src/config/features';
import { SOURCE_REPOSITORY_URL } from '../../src/config/legal';

type ThemePref = 'system' | 'light' | 'dark';

const LANGUAGE_KEY = 'siphon:language';
const THEME_STORAGE_KEY = 'siphon:theme';

type SupportedLanguage = 'en' | 'pt' | 'es' | 'fr' | 'de';

const LANGUAGE_LABEL_KEYS: Record<SupportedLanguage, string> = {
  en: 'settings.english',
  pt: 'settings.portuguese',
  es: 'settings.spanish',
  fr: 'settings.french',
  de: 'settings.german',
};

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return value === 'en' || value === 'pt' || value === 'es' || value === 'fr' || value === 'de';
}

function normalizeLanguage(value: string): SupportedLanguage {
  const base = value.split('-')[0];
  return isSupportedLanguage(base) ? base : 'en';
}

export default function SettingsScreen() {
  const { t, i18n: i18nInstance } = useTranslation();
  const router = useRouter();
  const { historyEnabled, setHistoryEnabled } = useUI();
  const { clearSavedRoadDistances } = useStationDistances();
  const [clearingRoutes, setClearingRoutes] = useState(false);
  const routeClearDialogRef = useRef(false);
  const historyDialogRef = useRef(false);
  const historyClearingRef = useRef(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const {
    updateAvailable,
    updateKind,
    latestVersion,
    installedVersion,
    distribution,
    checking,
    hasChecked,
    applying,
    autoCheckEnabled,
    autoCheckLoaded,
    autoCheckSaving,
    setAutoCheckEnabled,
    error,
    check,
    applyUpdate,
  } = useAppUpdate();
  const insets = useSafeAreaInsets();
  const [themePref, setThemePref] = useState<ThemePref>('system');
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(() => normalizeLanguage(i18nInstance.language));
  const languageSheetRef = useRef<LanguageSheetHandle>(null);
  const themeSheetRef = useRef<ThemeSheetHandle>(null);
  const locationMarkerSheetRef = useRef<LocationMarkerSheetHandle>(null);
  const vehicleSheetRef = useRef<VehicleSheetHandle>(null);
  const evSheetRef = useRef<EvBreakevenSheetHandle>(null);
  const rewardsSheetRef = useRef<RewardsSheetHandle>(null);
  const donationSheetRef = useRef<DonationSheetHandle>(null);
  const themeChangeVersionRef = useRef(0);
  const languageChangeVersionRef = useRef(0);

  const { watchedCount, privacyOptionsRequired, showPrivacyOptions, privacyRefreshing } = useSupport();
  const { paletteId, iconSet, styleSetId, styleRules, marker: currentMarker } = useAppearanceSupport();
  const { vehicles, addVehicle, updateVehicle, removeVehicle } = useVehicles();
  const { config: evConfig, setEvConfig } = useEvConfig();
  const { colors } = useThemeTokens();
  const cardRules = useStyleConfig(styleRules, 'card');
  const cardStyle = applyComponentRules(cardRules, colors.label);

  const persistLanguage = useCallback(async (lng: string) => {
    if (!isSupportedLanguage(lng)) return;
    languageChangeVersionRef.current += 1;
    try {
      await i18nInstance.changeLanguage(lng);
      setCurrentLang(lng);
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    } catch {
      // Keep the currently active language if persistence fails.
    }
  }, [i18nInstance]);

  useEffect(() => {
    let cancelled = false;
    const themeVersion = themeChangeVersionRef.current;
    const languageVersion = languageChangeVersionRef.current;

    void Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY).catch(() => null),
      AsyncStorage.getItem(LANGUAGE_KEY).catch(() => null),
    ]).then(([theme, language]) => {
      if (cancelled) return;
      if (
        themeChangeVersionRef.current === themeVersion &&
        (theme === 'light' || theme === 'dark' || theme === 'system')
      ) {
        setThemePref(theme);
      }
      if (
        languageChangeVersionRef.current === languageVersion &&
        language &&
        isSupportedLanguage(language)
      ) {
        setCurrentLang(language);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleThemeChange = (pref: ThemePref) => {
    themeChangeVersionRef.current += 1;
    setThemePref(pref);
    nativewindColorScheme.set(pref);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, pref).catch(() => undefined);
  };

  const handleToggleHistory = (value: boolean) => {
    if (historyDialogRef.current || historyClearingRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (value) {
      setHistoryEnabled(true);
      return;
    }
    historyDialogRef.current = true;
    Alert.alert(t('settings.history_confirm_title'), t('settings.history_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel', onPress: () => { historyDialogRef.current = false; } },
      {
        text: t('settings.history_delete_action'),
        style: 'destructive',
        onPress: () => {
          if (historyClearingRef.current) return;
          historyClearingRef.current = true;
          setClearingHistory(true);
          void client.clearHistoryCache().then(() => {
            setHistoryEnabled(false);
          }).catch(() => {
            Alert.alert(t('common.something_went_wrong'), t('settings.history_delete_failed'));
          }).finally(() => {
            historyDialogRef.current = false;
            historyClearingRef.current = false;
            setClearingHistory(false);
          });
        },
      },
    ], { cancelable: true, onDismiss: () => { historyDialogRef.current = false; } });
  };

  const handleClearRoutes = () => {
    if (routeClearDialogRef.current || clearingRoutes) return;
    routeClearDialogRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    Alert.alert(t('settings.route_cache_confirm_title'), t('settings.route_cache_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel', onPress: () => { routeClearDialogRef.current = false; } },
      {
        text: t('settings.route_cache_clear_action'),
        style: 'destructive',
        onPress: () => {
          setClearingRoutes(true);
          void clearSavedRoadDistances().then((count) => {
            Alert.alert(
              t(count > 0 ? 'settings.route_cache_cleared_title' : 'settings.route_cache_empty_title'),
              count > 0 ? t('settings.route_cache_cleared_body', { count }) : t('settings.route_cache_empty_body'),
            );
          }).catch(() => {
            Alert.alert(t('settings.route_cache_error_title'), t('settings.route_cache_error_body'));
          }).finally(() => {
            routeClearDialogRef.current = false;
            setClearingRoutes(false);
          });
        },
      },
    ], { cancelable: false });
  };

  const handlePrivacyOptions = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const result = await showPrivacyOptions();
    if (result === 'not_required') {
      Alert.alert(
        t('settings.privacy_not_required_title'),
        t('settings.privacy_not_required_body'),
      );
    } else if (result === 'failed') {
      Alert.alert(
        t('settings.privacy_error_title'),
        t('settings.privacy_error_body'),
      );
    }
  };

  const handleApplyUpdate = async () => {
    if (applying) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const ok = await applyUpdate();
    if (!ok) {
      Alert.alert(t('settings.update_error_title'), t('settings.update_apply_failed'));
    }
  };

  const handleToggleAutoCheck = async (enabled: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (!await setAutoCheckEnabled(enabled)) {
      Alert.alert(t('settings.update_error_title'), t('settings.update_preference_save_failed'));
    }
  };

  const updateActionLabel = applying
    ? t('settings.installing_update')
    : updateKind === 'ota'
      ? t('settings.install_update')
      : distribution === 'play'
        ? t('settings.update_on_play')
        : t('settings.download_apk');

  const distributionLabel = t(`settings.distribution_${distribution}`);

  const handleSaveVehicle = (data: Omit<Vehicle, 'id'>, id?: string) => {
    if (id) updateVehicle({ ...data, id });
    else addVehicle(data);
  };

  const langLabel = t(LANGUAGE_LABEL_KEYS[currentLang]);
  const themeLabel = t(`settings.theme_${themePref}`);
  const markerLabel = currentMarker.type === 'svg'
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
          <ListItem onPress={() => rewardsSheetRef.current?.present()} trailing={t(iconSet.labelKey)}>
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
                          style={{ color: colors.secondaryLabel, textAlign: I18nManager.isRTL ? 'left' : 'right' }}
                          className="text-body"
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
            <Text style={{ color: colors.label, marginEnd: 8 }} className="text-callout flex-1">
              {t('settings.save_history')}
            </Text>
            <Switch
              value={historyEnabled}
              onValueChange={handleToggleHistory}
              disabled={clearingHistory}
              accessibilityLabel={t('settings.save_history')}
            />
          </View>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-md pt-xs">
            {t('settings.save_history_caption')}
          </Text>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.data_storage')}
          </Text>
          <ListItem onPress={clearingRoutes ? undefined : handleClearRoutes}>
            {t(clearingRoutes ? 'settings.route_cache_clearing' : 'settings.clear_route_cache')}
          </ListItem>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-md pt-xs">
            {t('settings.route_cache_caption')}
          </Text>
        </View>

        {MONETIZATION_ENABLED && <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.privacy_ads')}
          </Text>
          <ListItem
            onPress={() => { void handlePrivacyOptions(); }}
            trailing={
              privacyRefreshing
                ? t('settings.checking')
                : privacyOptionsRequired
                  ? t('settings.privacy_available')
                  : undefined
            }
          >
            {t('settings.ad_privacy_choices')}
          </ListItem>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-md pt-xs">
            {t('settings.ads_opt_in_caption')}
          </Text>
        </View>}

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.ev_compare_title')}
          </Text>
          <ListItem onPress={() => evSheetRef.current?.present()}>
            {t('settings.ev_compare_sub')}
          </ListItem>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-md pt-xs">
            {t('settings.ev_tco_caption')}
          </Text>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.updates')}
          </Text>
          <View style={{ backgroundColor: colors.surface }} className="flex-row items-center justify-between px-lg py-md">
            <Text style={{ color: colors.label, marginEnd: 8 }} className="text-callout flex-1">
              {t('settings.auto_check_updates')}
            </Text>
            <Switch
              value={autoCheckEnabled}
              disabled={!autoCheckLoaded || autoCheckSaving}
              onValueChange={(value) => { void handleToggleAutoCheck(value); }}
              accessibilityLabel={t('settings.auto_check_updates')}
            />
          </View>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-md">
            {t('settings.auto_check_updates_caption')}
          </Text>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem
            trailing={
              checking
                ? t('settings.checking')
                : error === 'no_releases'
                  ? t('settings.no_releases')
                  : error === 'check_failed'
                    ? t('settings.update_check_failed')
                    : error === 'apply_failed'
                      ? t('settings.update_apply_failed_short')
                      : updateKind === 'ota'
                        ? t('settings.update_available_ota')
                        : updateKind === 'binary'
                          ? t('settings.update_available_version', { version: latestVersion })
                          : !hasChecked
                            ? t('settings.update_not_checked')
                            : t('settings.up_to_date')
            }
          >
            {t('settings.update_status')}
          </ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem trailing={distributionLabel}>{t('settings.update_distribution')}</ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem onPress={() => { void check(true); }}>{t('settings.check_for_updates')}</ListItem>
          {updateAvailable && (
            <>
              <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
              <View className="px-lg py-md gap-xs">
                <Button onPress={() => { void handleApplyUpdate(); }}>
                  {updateActionLabel}
                </Button>
                <Text style={{ color: colors.secondaryLabel }} className="text-footnote text-center">
                  {updateKind === 'ota'
                    ? t('settings.update_ota_caption')
                    : distribution === 'play'
                      ? t('settings.update_play_caption')
                      : t('settings.update_github_caption')}
                </Text>
              </View>
            </>
          )}
        </View>

        {MONETIZATION_ENABLED && <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
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
        </View>}

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="mx-lg rounded-md overflow-hidden">
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.about')}
          </Text>
          <ListItem trailing="Siphon">{t('settings.app_name')}</ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem trailing="SiphonAPI">{t('settings.data_source')}</ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem onPress={() => router.push('/legal' as never)}>{t('settings.legal_information')}</ListItem>
          <View style={{ backgroundColor: colors.separator }} className="h-px mx-lg" />
          <ListItem onPress={() => { void Linking.openURL(SOURCE_REPOSITORY_URL); }}>{t('settings.source_code')}</ListItem>
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
        vehicles={vehicles}
      />
      <RewardsSheet ref={rewardsSheetRef} />
      {MONETIZATION_ENABLED && <DonationSheet ref={donationSheetRef} />}
    </SafeAreaView>
  );
}
