import { memo, useCallback, useMemo } from 'react';
import { Linking, Pressable, Text, TouchableOpacity, View, type GestureResponderEvent } from 'react-native';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useMappingHelper } from '@shopify/flash-list';

import type { FuelKey, FuelStationFeature } from '../api/siphonClient';
import { PriceBadge } from './PriceBadge';
import { Icon } from '../theme/Icon';
import { cleanAddress, getLocationParts, getMapsUrl } from '../utils/location';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useAppearanceSupport } from '../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../hooks/useStyleConfig';
import { GlassBackdrop } from './ui/glass';

interface StationCardProps {
  station: FuelStationFeature;
  onPress?: (station: FuelStationFeature) => void;
  favorite?: boolean;
  onToggleFavorite?: (station: FuelStationFeature) => void;
  distanceKm?: number;
  distanceLoading?: boolean;
  distanceRouted?: boolean;
}

const StationCardComponent: FC<StationCardProps> = ({
  station,
  onPress,
  favorite = false,
  onToggleFavorite,
  distanceKm,
  distanceLoading = false,
  distanceRouted = false,
}) => {
  const { t } = useTranslation();
  const { getMappingKey } = useMappingHelper();
  const { name, brand, fuels } = station.properties;
  const entries = useMemo(() => Object.entries(fuels) as [FuelKey, number][], [fuels]);
  const locationParts = useMemo(() => getLocationParts(station.properties), [station.properties]);
  const { colors } = useThemeTokens();
  const { styleRules } = useAppearanceSupport();
  const rules = useStyleConfig(styleRules, 'stationCard');
  const glass = isGlass(rules);
  const displayName = brand || name || t('common.unknown_station');

  const handleToggleFavorite = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      onToggleFavorite?.(station);
    },
    [onToggleFavorite, station],
  );

  const handleOpenInMaps = useCallback(() => {
    const url = getMapsUrl(station);
    void Linking.openURL(url).catch(() => undefined);
  }, [station]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress?.(station)}
      style={[
        { backgroundColor: glass ? 'transparent' : colors.groupedBackground },
        applyComponentRules(rules, colors.label),
      ]}
      className="p-md rounded-md"
      accessibilityRole="button"
      accessibilityLabel={displayName}
    >
      {glass && <GlassBackdrop color={colors.groupedBackground} />}

      <View className="flex-row items-start justify-between">
        <View style={{ flex: 1, marginEnd: 8 }}>
          <Text style={{ color: colors.label }} className="text-headline">
            {displayName}
          </Text>
          {brand && name && brand !== name && (
            <Text style={{ color: colors.secondaryLabel }} className="text-subheadline mt-0.5">
              {name}
            </Text>
          )}
        </View>

        <Pressable
          onPress={handleToggleFavorite}
          style={{ padding: 4 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${favorite ? t('station.remove_favorite') : t('station.add_favorite')}: ${displayName}`}
          accessibilityState={{ selected: favorite }}
        >
          <View className="rounded-sm p-1.5">
            <Icon
              name={favorite ? 'star.fill' : 'star'}
              size={19}
              color={favorite ? colors.favorite : colors.tertiaryLabel}
            />
          </View>
        </Pressable>
      </View>

      <View className="flex-row items-start mt-0.5">
        <View style={{ flex: 1, marginEnd: 8 }}>
          <Text style={{ color: colors.secondaryLabel }} className="text-callout">
            {cleanAddress(station.properties)}
          </Text>
          {locationParts.length > 0 && (
            <Text style={{ color: colors.tertiaryLabel }} className="text-footnote mt-0.5">
              {locationParts.join(', ')}
            </Text>
          )}

          {distanceKm !== undefined && Number.isFinite(distanceKm) && (
            <View className="flex-row items-center gap-1 mt-0.5">
              <Text style={{ color: colors.tertiaryLabel }} className="text-footnote">
                {!distanceRouted ? '~' : ''}{distanceKm < 1
                  ? `${(distanceKm * 1000).toFixed(0)} m`
                  : `${distanceKm.toFixed(1)} km`}{' '}
                {t('station.from_location')}
              </Text>
              {distanceLoading && !distanceRouted && (
                <Text style={{ color: colors.priceMid }} className="text-[10px]">
                  ({t('station.distance_optimizing')})
                </Text>
              )}
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={handleOpenInMaps}
            style={{ padding: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`${t('station.open_in_maps')}: ${displayName}`}
          >
            <View className="rounded-sm p-1.5">
              <Icon name="directions" size={19} color={colors.secondaryLabel} />
            </View>
          </Pressable>
        </View>
      </View>

      {entries.length > 0 && (
        <View className="flex-row flex-wrap gap-sm mt-sm">
          {entries.map(([fuel, price], index) => (
            <PriceBadge
              key={getMappingKey(fuel, index)}
              fuel={fuel}
              price={price}
              source={station.properties.source}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const StationCard = memo(StationCardComponent);
