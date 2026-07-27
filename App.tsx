import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FuelDataClient, FuelStationFeature } from './src/api/siphonClient';


// Fill in your repo before running.
const client = new FuelDataClient({
  store: AsyncStorage,
  baseUrl: 'https://raw.githubusercontent.com/8041q/SiphonAPI/main',
});

export default function App() {
  const [stations, setStations] = useState<FuelStationFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = pos.coords;

      await client.checkForUpdates(); // refreshes cached manifests if anything changed
      const nearby = await client.getStationsNear(latitude, longitude);
      setStations(nearby);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.dim}>Finding stations near you…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={stations}
        keyExtractor={(item) => item.properties.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
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
});
