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
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useSupport } from '../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../hooks/useStyleConfig';
import { GlassBackdrop } from './ui/glass';

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
  const { stationDistances, distanceLoading, distanceImproving, improveDistances } = useStations();
  const distanceKm = stationDistances.get(station.properties.id);
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'stationCard');
  const glass = isGlass(rules);

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

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        onPress?.(station);
      }}
      style={[{ backgroundColor: glass ? 'transparent' : colors.groupedBackground }, applyComponentRules(rules)]}
      className="p-md rounded-md"
    >
      {glass && <GlassBackdrop color={colors.groupedBackground} />}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text style={{ color: colors.label }} className="text-headline">
            {brand || name || t('common.unknown_station')}
          </Text>
          {brand && name && brand !== name && (
            <Text style={{ color: colors.secondaryLabel }} className="text-subheadline mt-0.5">
              {name}
            </Text>
          )}
        </View>
        <Pressable onPress={handleToggleFavorite} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View className="rounded-sm p-1.5">
            <Icon
              name={favorite ? 'star.fill' : 'star'}
              size={18}
              color={favorite ? colors.favorite : colors.tertiaryLabel}
            />
          </View>
        </Pressable>
      </View>
      <View className="flex-row items-start mt-0.5">
        <View className="flex-1 mr-2">
          <Text style={{ color: colors.secondaryLabel }} className="text-callout">
            {cleanAddress(station.properties)}
          </Text>
          {locationParts.length > 0 && (
            <Text style={{ color: colors.tertiaryLabel }} className="text-footnote mt-0.5">
              {locationParts.join(', ')}
              {(schedule || hours) ? ' · ' : ''}
            </Text>
          )}
          {distanceKm !== undefined && (
            <View className="flex-row items-center gap-1 mt-0.5">
              <Text style={{ color: colors.tertiaryLabel }} className="text-footnote">
                {distanceKm < 1
                  ? `${(distanceKm * 1000).toFixed(0)} m`
                  : `${distanceKm.toFixed(1)} km`}{' '}
                {t('station.from_location')}
              </Text>
              {distanceLoading && (
                <Text style={{ color: colors.priceMid }} className="text-[10px]">
                  ({t('station.distance_optimizing')})
                </Text>
              )}
              {!distanceLoading && !distanceImproving && (
                <Pressable onPress={improveDistances} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} disabled={distanceImproving}>
                  <Text style={{ color: colors.tint }} className="text-[10px] underline">
                    {t('station.improve_calculation')}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={handleOpenInMaps} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View className="rounded-sm p-1.5">
              <Icon name="directions" size={19} color={colors.secondaryLabel} />
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