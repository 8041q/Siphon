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
import { useStyleConfig, applyComponentRules, isGlass, componentSurface } from '../hooks/useStyleConfig';
import { GlassBackdrop } from './ui/glass';
import { useAppearanceLayout } from '../hooks/useAppearanceLayout';

interface StationCardProps {
  station: FuelStationFeature;
  onPress?: (station: FuelStationFeature) => void;
  favorite?: boolean;
  onToggleFavorite?: (station: FuelStationFeature) => void;
  onShowOnMap?: (station: FuelStationFeature) => void;
  distanceKm?: number;
  distanceLoading?: boolean;
  distanceRouted?: boolean;
  featuredFuel?: FuelKey | null;
}

const StationCardComponent: FC<StationCardProps> = ({
  station,
  onPress,
  favorite = false,
  onToggleFavorite,
  onShowOnMap,
  distanceKm,
  distanceLoading = false,
  distanceRouted = false,
  featuredFuel,
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
  const { modern, space } = useAppearanceLayout();
  const priceEntries = useMemo(() => {
    if (!modern || !featuredFuel) return entries;
    return [...entries.filter(([fuel]) => fuel === featuredFuel), ...entries.filter(([fuel]) => fuel !== featuredFuel)];
  }, [entries, featuredFuel, modern]);
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

  const handleShowOnMap = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      onShowOnMap?.(station);
    },
    [onShowOnMap, station],
  );

  const accessibilityActions = useMemo(
    () => [
      {
        name: 'toggleFavorite',
        label: favorite ? t('station.remove_favorite') : t('station.add_favorite'),
      },
      { name: 'openMaps', label: t('station.open_in_maps') },
      ...(onShowOnMap ? [{ name: 'showOnMap', label: t('station.show_on_map') }] : []),
    ],
    [favorite, onShowOnMap, t],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress?.(station)}
      style={[
        { backgroundColor: glass ? 'transparent' : componentSurface(rules, colors, 'groupedBackground') },
        applyComponentRules(rules, colors.separator),
      ]}
      className="p-md rounded-md"
      accessibilityRole="button"
      accessibilityLabel={displayName}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={(event) => {
        switch (event.nativeEvent.actionName) {
          case 'toggleFavorite':
            onToggleFavorite?.(station);
            break;
          case 'openMaps':
            handleOpenInMaps();
            break;
          case 'showOnMap':
            onShowOnMap?.(station);
            break;
          default:
            break;
        }
      }}
    >
      {glass && <GlassBackdrop color={colors.groupedBackground} borderRadius={rules.borderRadius} />}

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

        <View className="items-center gap-1">
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              handleOpenInMaps();
            }}
            style={{ padding: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`${t('station.open_in_maps')}: ${displayName}`}
          >
            <View className="rounded-sm p-1.5">
              <Icon name="directions" size={19} color={colors.secondaryLabel} />
            </View>
          </Pressable>
          {onShowOnMap && (
            <Pressable
              onPress={handleShowOnMap}
              style={{ padding: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`${t('station.show_on_map')}: ${displayName}`}
            >
              <View className="rounded-sm p-1.5">
                <Icon name="map.fill" size={19} color={colors.secondaryLabel} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {priceEntries.length > 0 && (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          {modern ? <>
            <PriceBadge fuel={priceEntries[0][0]} price={priceEntries[0][1]} source={station.properties.source} prominent />
            {priceEntries.length > 1 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: space.sm }}>
              {priceEntries.slice(1).map(([fuel, price], index) => <PriceBadge key={getMappingKey(fuel, index)} fuel={fuel} price={price} source={station.properties.source} />)}
            </View>}
          </> : <View className="flex-row flex-wrap gap-sm">
            {priceEntries.map(([fuel, price], index) => <PriceBadge key={getMappingKey(fuel, index)} fuel={fuel} price={price} source={station.properties.source} />)}
          </View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const StationCard = memo(StationCardComponent);
