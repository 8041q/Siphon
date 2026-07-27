import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FuelDataClient, FuelStationFeature } from './src/api/siphonClient';


// ---- Hybrid store: tile data + snapshots → files; small keys → AsyncStorage ----
const DATA_DIR = FileSystem.documentDirectory + 'siphon/';

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

// Tile data keys: "siphon:data:<tile-path>" → file under tiles/
function tileFilePath(key: string): string {
  const tilePath = key.slice('siphon:data:'.length);
  return DATA_DIR + 'tiles/' + tilePath;
}

// Snapshot keys: "siphon:snapshot:YYYY-MM-DD" → file under snapshots/
function snapshotFilePath(key: string): string {
  const date = key.slice('siphon:snapshot:'.length);
  return DATA_DIR + 'snapshots/' + date + '.json';
}

function isFileKey(key: string): boolean {
  return key.startsWith('siphon:data:') || key.startsWith('siphon:snapshot:');
}

function filePathForKey(key: string): string {
  if (key.startsWith('siphon:data:')) return tileFilePath(key);
  if (key.startsWith('siphon:snapshot:')) return snapshotFilePath(key);
  throw new Error('Unsupported key: ' + key);
}

const hybridStore = {
  async getItem(key: string): Promise<string | null> {
    if (!isFileKey(key)) return AsyncStorage.getItem(key);
    try {
      return await FileSystem.readAsStringAsync(filePathForKey(key));
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isFileKey(key)) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await ensureDir(DATA_DIR);
    if (key.startsWith('siphon:data:')) {
      await ensureDir(DATA_DIR + 'tiles/');
      // Ensure subdirectories for tile path exist
      const tilePath = key.slice('siphon:data:'.length);
      const lastSlash = tilePath.lastIndexOf('/');
      if (lastSlash > 0) {
        await ensureDir(DATA_DIR + 'tiles/' + tilePath.slice(0, lastSlash));
      }
    }
    if (key.startsWith('siphon:snapshot:')) {
      await ensureDir(DATA_DIR + 'snapshots/');
    }
    await FileSystem.writeAsStringAsync(filePathForKey(key), value);
  },

  async listKeys(prefix: string): Promise<string[]> {
    if (prefix === 'siphon:snapshot:') {
      try {
        await ensureDir(DATA_DIR + 'snapshots/');
        const files = await FileSystem.readDirectoryAsync(DATA_DIR + 'snapshots/');
        return files
          .filter(f => f.endsWith('.json'))
          .map(f => 'siphon:snapshot:' + f.replace(/\.json$/, ''));
      } catch {
        return [];
      }
    }
    return [];
  },

  async removeItem(key: string): Promise<void> {
    if (!isFileKey(key)) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await FileSystem.deleteAsync(filePathForKey(key), { idempotent: true });
  },
};

const client = new FuelDataClient({
  store: hybridStore,
  baseUrl: 'https://raw.githubusercontent.com/8041q/SiphonAPI/main',
});

export default function App() {
  const [stations, setStations] = useState<FuelStationFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [locationApproximate, setLocationApproximate] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOffline(false);
    setLocationApproximate(false);
    setSyncProgress(null);

    // --- Location: graceful fallback chain ---
    let latitude = 40.4168;
    let longitude = -3.7038;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          // Use low accuracy (WiFi/cell towers) — no GPS required
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch {
          // Fallback to last known position
          try {
            const last = await Location.getLastKnownPositionAsync();
            if (last) {
              latitude = last.coords.latitude;
              longitude = last.coords.longitude;
            }
          } catch {
            // Both failed — keep default coordinates
          }
          setLocationApproximate(true);
        }
      } else {
        setLocationApproximate(true);
      }
    } catch {
      setLocationApproximate(true);
    }

    // --- Network data ---
    try {
      // Step 1: conditional GET on root manifest to detect changes
      setSyncProgress('Checking for updates…');
      const { changedCountries, offline: wasOffline } = await client.checkForUpdates();
      setOffline(wasOffline);

      // Step 2: sync every tile/district for both countries.
      // On first launch every tile is downloaded from the network.
      // On subsequent launches with a 304 root manifest, all tiles are
      // read from cache — `syncAll` completes in <1 second at zero
      // network cost.
      setSyncProgress('Downloading stations data…');
      await client.syncAll(changedCountries, (loaded, total) => {
        if (total > 0 && changedCountries.length > 0) {
          setSyncProgress(`Downloading stations data ${loaded}/${total}…`);
        }
      });

      // Step 2.5: record today's price snapshot (no-op if already recorded today)
      await client.recordDailySnapshot();

      // Step 3: read stations near user — entirely from cache now
      setSyncProgress('Loading nearby stations…');
      const nearby = await client.getStationsNear(latitude, longitude, changedCountries);
      setStations(nearby);

      // Show a helpful message when offline with no cached data
      if (wasOffline && nearby.length === 0) {
        setError('No internet connection. Connect to download station data on first use.');
      }
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
      setSyncProgress(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.dim}>{syncProgress ?? 'Loading…'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Using cached data — no connection</Text>
        </View>
      )}
      {locationApproximate && (
        <View style={styles.locationBanner}>
          <Text style={styles.locationText}>Approximate location — enable GPS for better accuracy</Text>
        </View>
      )}
      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.properties.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const { name, brand, address, fuels } = item.properties;
            return (
              <View style={styles.card}>
                <Text style={styles.brand}>{brand || name || 'Unknown station'}</Text>
                <Text style={styles.address}>{address}</Text>
                <View style={styles.prices}>
                  {Object.entries(fuels ?? {}).map(([fuel, price]) => (
                    <Text key={fuel} style={styles.price}>
                      {fuel}: {Number(price).toFixed(3)} €
                    </Text>
                  ))}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.dim}>No stations found nearby.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { padding: 16, gap: 12 },
  card: { padding: 14, borderRadius: 12, backgroundColor: '#f4f4f5', gap: 4 },
  brand: { fontSize: 16, fontWeight: '700' },
  address: { fontSize: 13, color: '#555' },
  prices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  price: { fontSize: 13, fontWeight: '600' },
  dim: { color: '#888', marginTop: 8 },
  error: { color: '#c00', textAlign: 'center' },
  offlineBanner: { backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 16 },
  offlineText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
  locationBanner: { backgroundColor: '#e0f2fe', paddingVertical: 6, paddingHorizontal: 16 },
  locationText: { color: '#075985', fontSize: 13, textAlign: 'center' },
});