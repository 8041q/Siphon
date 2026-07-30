import { memo } from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { FuelStationFeature } from '../api/siphonClient';
import { PriceBadge } from './PriceBadge';
import { Icon } from '../theme/Icon';

const FAVORITE_COLOR = '#FFD60A';

interface StationCardProps {
  station: FuelStationFeature;
  onPress?: (station: FuelStationFeature) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (station: FuelStationFeature) => void;
}

const StationCardComponent: FC<StationCardProps> = ({ station, onPress, favorites, onToggleFavorite }) => {
  const { t } = useTranslation();
  const { name, brand, address, fuels, municipality, district, hours, schedule } = station.properties;
  const entries = Object.entries(fuels ?? {});
  const favorite = favorites?.has(station.properties.id) ?? false;

  const handleToggleFavorite = (e: any) => {
    e.stopPropagation();
    onToggleFavorite?.(station);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        onPress?.(station);
      }}
      className="p-md rounded-md bg-grouped-background dark:bg-grouped-background-dark"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-headline text-label dark:text-label-dark">
          {brand || name || t('common.unknown_station')}
        </Text>
        <Pressable onPress={handleToggleFavorite} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View className="bg-surface dark:bg-surface-dark rounded-sm p-1.5">
            <Icon
              name={favorite ? 'star.fill' : 'star'}
              size={18}
              color={favorite ? FAVORITE_COLOR : undefined}
            />
          </View>
        </Pressable>
      </View>
      <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark">{address}</Text>
      {(municipality || district) && (
        <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark mt-0.5">
          {[municipality, district].filter(Boolean).join(', ')}
          {(schedule || hours) ? ' · ' : ''}
          {(schedule || hours) ? t('station.hours') : ''}
        </Text>
      )}
      {entries.length > 0 && (
        <View className="flex-row flex-wrap gap-sm mt-sm">
          {entries.map(([fuel, price]) => (
            <PriceBadge key={fuel} fuel={fuel} price={Number(price)} source={station.properties.source} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export const StationCard = memo(StationCardComponent);