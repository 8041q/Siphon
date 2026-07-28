import { useState } from 'react';
import { Alert, useColorScheme } from 'react-native';

import { client } from '../../src/hooks/useApp';
import { tokens } from '../../src/theme/tokens';
import { FieldGroup, ListItem } from '@expo/ui';
import { ComposeBoundary } from '../../src/components/ComposeBoundary';

export default function SettingsScreen() {
  const [clearing, setClearing] = useState(false);
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? tokens.color.dark : tokens.color.light;

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
    <ComposeBoundary style={{ flex: 1, backgroundColor: colors.background }}>
      <FieldGroup>
        <FieldGroup.Section title="Price History">
          <ListItem onPress={handleTrimHistory}>
            Trim old snapshots (keep 2 months)
          </ListItem>
          <ListItem onPress={handleClearHistory}>
            Clear all price history
          </ListItem>
        </FieldGroup.Section>
        <FieldGroup.Section title="About">
          <ListItem>Siphon</ListItem>
          <ListItem trailing="SiphonAPI">Data source</ListItem>
          <ListItem trailing="1.0.0">Version</ListItem>
        </FieldGroup.Section>
      </FieldGroup>
    </ComposeBoundary>
  );
}