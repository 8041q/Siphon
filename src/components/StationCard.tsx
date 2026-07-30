import { memo, useCallback } from 'react';
import { Linking, Pressable, Text, TouchableOpacity, View } from 'react-native';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';

import type { FuelStationFeature } from '../api/siphonClient';
import { PriceBadge } from './PriceBadge';
import { Icon } from '../theme/Icon';
import { cleanAddress, getLocationParts, formatStationAddress, getMapsUrl } from '../utils/location';
import { useStations } from '../hooks/useApp';

const FAVORITE_COLOR = '#FFD60A';

interface StationCardProps {
  station: FuelStationFeature;
  onPress?: (station: FuelStationFeature) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (station: FuelStationFeature) => void;
}

const StationCardComponent: FC<StationCardProps> = ({ station, onPress, favorites, onToggleFavorite }) => {
  const { t } = useTranslation();
  const { name, brand, address, fuels, hours, schedule, source } = station.properties;
  const entries = Object.entries(fuels ?? {});
  const favorite = favorites?.has(station.properties.id) ?? false;
  const locationParts = getLocationParts(station.properties);
  const { stationDistances } = useStations();
  const distanceKm = stationDistances.get(station.properties.id);

  const handleToggleFavorite = (e: any) => {
    e.stopPropagation();
    onToggleFavorite?.(station);
  };

  const handleCopyAddress = useCallback(() => {
    const formatted = formatStationAddress(station.properties);
    Clipboard.setStringAsync(formatted);
  }, [station.properties]);

  const handleOpenInMaps = useCallback(() => {
    const url = getMapsUrl(station);
    Linking.openURL(url);
  }, [station]);

  const secondaryLabel = 'rgba(60, 60, 67, 0.6)';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        onPress?.(station);
      }}
      className="p-md rounded-md bg-grouped-background dark:bg-grouped-background-dark"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-headline text-label dark:text-label-dark">
            {brand || name || t('common.unknown_station')}
          </Text>
          {brand && name && brand !== name && (
            <Text className="text-subheadline text-secondary-label dark:text-secondary-label-dark mt-0.5">
              {name}
            </Text>
          )}
        </View>
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
      <View className="flex-row items-start mt-0.5">
        <View className="flex-1 mr-2">
          <Text className="text-callout text-secondary-label dark:text-secondary-label-dark">
            {cleanAddress(station.properties)}
          </Text>
          {locationParts.length > 0 && (
            <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark mt-0.5">
              {locationParts.join(', ')}
              {(schedule || hours) ? ' · ' : ''}
              {(schedule || hours) ? t('station.hours') : ''}
            </Text>
          )}
          {distanceKm !== undefined && (
            <Text className="text-footnote text-tertiary-label dark:text-tertiary-label-dark mt-0.5">
              {distanceKm < 1
                ? `${(distanceKm * 1000).toFixed(0)} m`
                : `${distanceKm.toFixed(1)} km`} {t('station.from_location')}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={handleOpenInMaps} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View className="bg-surface dark:bg-surface-dark rounded-sm p-1.5">
              <Icon name="directions" size={14} color={secondaryLabel} />
            </View>
          </Pressable>
          <Pressable onPress={handleCopyAddress} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View className="bg-surface dark:bg-surface-dark rounded-sm p-1.5">
              <Icon name="copy" size={14} color={secondaryLabel} />
            </View>
          </Pressable>
        </View>
      </View>
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