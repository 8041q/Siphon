import { memo } from 'react';
import { Pressable, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import type { FC } from 'react';

import type { FuelStationFeature } from '../api/siphonClient';
import { PriceBadge } from './PriceBadge';
import { Icon } from '../theme/Icon';
import { tokens } from '../theme/tokens';

const FAVORITE_COLOR = '#FFD60A';

interface StationCardProps {
  station: FuelStationFeature;
  onPress?: (station: FuelStationFeature) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (station: FuelStationFeature) => void;
}

const StationCardComponent: FC<StationCardProps> = ({ station, onPress, favorites, onToggleFavorite }) => {
  const colorScheme = useColorScheme();
  const { name, brand, address, fuels } = station.properties;
  const entries = Object.entries(fuels ?? {});
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  const s = tokens.spacing;
  const r = tokens.radius;
  const t = tokens.typography;
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
      style={{
        padding: s.md,
        borderRadius: r.md,
        backgroundColor: colors.groupedBackground,
        gap: s.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: t.headline.size, fontWeight: t.headline.weight, color: colors.label }}>
          {brand || name || 'Unknown station'}
        </Text>
        <Pressable onPress={handleToggleFavorite} style={{ padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: r.sm,
            padding: 6,
          }}>
            <Icon
              name={favorite ? 'star.fill' : 'star'}
              size={18}
              color={favorite ? FAVORITE_COLOR : colors.secondaryLabel}
            />
          </View>
        </Pressable>
      </View>
      <Text style={{ fontSize: t.footnote.size, color: colors.secondaryLabel }}>{address}</Text>
      {entries.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: s.sm,
            marginTop: s.sm,
          }}
        >
          {entries.map(([fuel, price]) => (
            <PriceBadge key={fuel} fuel={fuel} price={Number(price)} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export const StationCard = memo(StationCardComponent);