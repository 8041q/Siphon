import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Appearance, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { useTranslation } from 'react-i18next';

import { client } from '../../src/hooks/useApp';
import { useUserLocationMarker } from '../../src/hooks/useUserLocationMarker';
import { ListItem } from '../../src/components/ui/list-item';
import { LanguageSheet, LanguageSheetHandle } from '../../src/components/LanguageSheet';
import { LocationMarkerSheet, LocationMarkerSheetHandle } from '../../src/components/LocationMarkerSheet';

type ThemePref = 'system' | 'light' | 'dark';

const LANGUAGE_KEY = 'siphon:language';
const THEME_STORAGE_KEY = 'siphon:theme';

export default function SettingsScreen() {
  const { t, i18n: i18nInstance } = useTranslation();
  const [clearing, setClearing] = useState(false);
  const [themePref, setThemePref] = useState<ThemePref>('system');
  const [currentLang, setCurrentLang] = useState(i18nInstance.language);
  const languageSheetRef = useRef<LanguageSheetHandle>(null);
  const locationMarkerSheetRef = useRef<LocationMarkerSheetHandle>(null);

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

  const handleClearHistory = () => {
    Alert.alert(
      t('settings.clear_alert_title'),
      t('settings.clear_alert_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete_all'),
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              const result = await client.clearPriceHistory();
              Alert.alert(t('common.done'), t('settings.deleted_snapshots', { count: result.deleted }));
            } catch (e: any) {
              Alert.alert(t('common.done'), e.message ?? t('settings.clear_failed'));
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleTrimHistory = () => {
    Alert.alert(
      t('settings.trim_alert_title'),
      t('settings.trim_alert_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.trim'),
          onPress: async () => {
            setClearing(true);
            try {
              const result = await client.trimPriceHistory(2);
              Alert.alert(t('common.done'), t('settings.deleted_old_snapshots', { count: result.deleted }));
            } catch (e: any) {
              Alert.alert(t('common.done'), e.message ?? t('settings.trim_failed'));
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
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
      <View className="flex-1 gap-lg">

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
            {t('settings.price_history')}
          </Text>
          <ListItem onPress={handleTrimHistory}>
            {t('settings.trim_list')}
          </ListItem>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem onPress={handleClearHistory}>
            {t('settings.clear_history')}
          </ListItem>
        </View>

        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            {t('settings.about')}
          </Text>
          <ListItem trailing="Siphon">{t('settings.app_name')}</ListItem>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem trailing="SiphonAPI">{t('settings.data_source')}</ListItem>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem trailing="1.0.0">{t('settings.version')}</ListItem>
        </View>
      </View>

      <LanguageSheet
        ref={languageSheetRef}
        currentLang={currentLang}
        onSelectLanguage={persistLanguage}
        onDismiss={() => {}}
      />
      <LocationMarkerSheet
        ref={locationMarkerSheetRef}
      />
    </SafeAreaView>
  );
}
