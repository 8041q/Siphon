import { memo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { FC } from 'react';

import type { FuelStationFeature } from '../api/siphonClient';
import { PriceBadge } from './PriceBadge';
import { Icon } from '../theme/Icon';
import { tokens } from '../theme/tokens';

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
  const [favorite, setFavorite] = useState<boolean>(() => favorites?.has(station.properties.id) ?? false);

  const handleToggleFavorite = (e: any) => {
    e.stopPropagation();
    const newFavorite = !favorite;
    setFavorite(newFavorite);
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
        <TouchableOpacity onPress={handleToggleFavorite} style={{ padding: 4 }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: r.sm,
            padding: 6,
          }}>
            <Icon
              name={favorite ? 'star.fill' : 'star'}
              size={18}
              color={favorite ? colors.tint : colors.secondaryLabel}
            />
          </View>
        </TouchableOpacity>
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