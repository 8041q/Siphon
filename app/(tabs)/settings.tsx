import { useEffect, useState } from 'react';
import { Alert, Appearance, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBackgroundColorAsync } from 'expo-system-ui';

import { client } from '../../src/hooks/useApp';
import { ListItem } from '../../src/components/ui/list-item';

type ThemePref = 'system' | 'light' | 'dark';

export default function SettingsScreen() {
  const [clearing, setClearing] = useState(false);
  const [themePref, setThemePref] = useState<ThemePref>('system');

  useEffect(() => {
    AsyncStorage.getItem('siphon:theme').then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setThemePref(val);
      }
    });
  }, []);

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
    AsyncStorage.setItem('siphon:theme', pref);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Price History',
      'This will delete ALL daily price snapshots. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              const result = await client.clearPriceHistory();
              Alert.alert('Done', `Deleted ${result.deleted} snapshot(s).`);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to clear history');
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
      'Trim Price History',
      'Keep snapshots from the last 2 months and delete everything older.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Trim',
          onPress: async () => {
            setClearing(true);
            try {
              const result = await client.trimPriceHistory(2);
              Alert.alert('Done', `Deleted ${result.deleted} old snapshot(s).`);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to trim history');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const themeOptions: { label: string; value: ThemePref }[] = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark" edges={['top']}>
      <View className="flex-1 gap-lg">
        
        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            Appearance
          </Text>
          {themeOptions.map((option) => (
            <View key={option.label}>
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
            Price History
          </Text>
          <ListItem onPress={handleTrimHistory}>
            Trim list (keep last 2 months)
          </ListItem>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem onPress={handleClearHistory}>
            Clear all price history
          </ListItem>
        </View>

        
        <View className="mx-lg rounded-md overflow-hidden bg-surface dark:bg-surface-dark">
          <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark px-lg pb-xs pt-md uppercase tracking-wide">
            About
          </Text>
          <ListItem trailing="Siphon">App Name</ListItem>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem trailing="SiphonAPI">Data source</ListItem>
          <View className="h-px bg-separator dark:bg-separator-dark mx-lg" />
          <ListItem trailing="1.0.0">Version</ListItem>
        </View>
      </View>
    </SafeAreaView>
  );
}
