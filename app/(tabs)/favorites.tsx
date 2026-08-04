import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { StationCard } from '../../src/components/StationCard';
import { useStations, useUI } from '../../src/hooks/useApp';
import { Icon } from '../../src/components/ui/icon';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const { allStations } = useStations();
  const { favorites, setSelectedStation, toggleFavorite } = useUI();
  const { colors } = useThemeTokens();

  const favoriteStations = allStations.filter(
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
        <View className="flex-1 justify-center items-center p-xl">
          <Icon name="star.fill" size={48} color={colors.placeholder} />
          <Text className="text-body mt-md" style={{ color: colors.secondaryLabel }}>
            {t('favorites.empty_title')}
          </Text>
          <Text className="text-footnote mt-xs" style={{ color: colors.tertiaryLabel }}>
            {t('favorites.empty_subtitle')}
          </Text>
        </View>
      ) : (
        <FlashList
          data={favoriteStations}
          keyExtractor={(item) => item.properties.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
