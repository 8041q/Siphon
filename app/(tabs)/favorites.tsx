import { useCallback } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationCard } from '../../src/components/StationCard';
import { useStations, useUI } from '../../src/hooks/useApp';
import { tokens } from '../../src/theme/tokens';
import { Icon } from '../../src/theme/Icon';

export default function FavoritesScreen() {
  const colorScheme = useColorScheme();
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  const s = tokens.spacing;
  const t = tokens.typography;

  const { filteredStations } = useStations();
  const { favorites, setSelectedStation, toggleFavorite } = useUI();

  const favoriteStations = filteredStations.filter(
    (station) => favorites?.has(station.properties.id)
  );

  const handleStationPress = useCallback(
    (station: (typeof favoriteStations)[number]) => {
      setSelectedStation(station);
    },
    [setSelectedStation]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {favoriteStations.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: s.xl }}>
          <Icon sf="star.fill" md="star" size={48} color={colors.tertiaryLabel} />
          <Text style={{ fontSize: t.body.size, color: colors.secondaryLabel, marginTop: s.md }}>
            No favorites yet
          </Text>
          <Text style={{ fontSize: t.footnote.size, color: colors.tertiaryLabel, marginTop: s.xs }}>
            Tap the star on a station to add it here
          </Text>
        </View>
      ) : (
        <FlashList
          data={favoriteStations}
          keyExtractor={(item) => item.properties.id}
          contentContainerStyle={{ padding: s.lg, gap: s.md }}
          renderItem={({ item }) => (
            <StationCard
              station={item}
              onPress={handleStationPress}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}