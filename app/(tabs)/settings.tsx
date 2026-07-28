import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { client } from '../../src/hooks/useApp';

export default function SettingsScreen() {
  const [clearing, setClearing] = useState(false);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price History</Text>
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={handleTrimHistory}
          disabled={clearing}
        >
          <Text style={styles.rowText}>Trim old snapshots (keep 2 months)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={handleClearHistory}
          disabled={clearing}
        >
          <Text style={[styles.rowText, styles.destructive]}>
            {clearing ? 'Working…' : 'Clear all price history'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Siphon</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>Data source</Text>
          <Text style={styles.rowValue}>SiphonAPI</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#f4f4f5',
    borderRadius: 10,
    marginBottom: 2,
  },
  rowText: { fontSize: 15, color: '#111' },
  rowValue: { fontSize: 14, color: '#6b7280' },
  destructive: { color: '#dc2626' },
});
