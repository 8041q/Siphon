import { useState } from 'react';
import { Alert, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { client } from '../../src/hooks/useApp';
import { ListItem } from '../../src/components/ui/list-item';

export default function SettingsScreen() {
  const [clearing, setClearing] = useState(false);
  const colorScheme = useColorScheme();

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

  return (
    <SafeAreaView
      className={`flex-1 ${colorScheme === 'dark' ? 'bg-background' : 'bg-grouped-background'}`}
    >
      <View className="py-lg">
        <View className="mx-lg rounded-md overflow-hidden bg-surface">
          <Text className="text-footnote text-secondary-label px-lg pb-xs pt-md uppercase tracking-wide">
            Price History
          </Text>
          <ListItem onPress={handleTrimHistory}>
            Trim old snapshots (keep 2 months)
          </ListItem>
          <View className="h-px bg-separator mx-lg" />
          <ListItem onPress={handleClearHistory}>
            Clear all price history
          </ListItem>
        </View>

        <View className="mx-lg rounded-md overflow-hidden bg-surface mt-xl">
          <Text className="text-footnote text-secondary-label px-lg pb-xs pt-md uppercase tracking-wide">
            About
          </Text>
          <ListItem trailing="Siphon">App Name</ListItem>
          <View className="h-px bg-separator mx-lg" />
          <ListItem trailing="SiphonAPI">Data source</ListItem>
          <View className="h-px bg-separator mx-lg" />
          <ListItem trailing="1.0.0">Version</ListItem>
        </View>
      </View>
    </SafeAreaView>
  );
}
