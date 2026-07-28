import { Text, TouchableOpacity, View } from 'react-native';
import type { FC } from 'react';
import { memo } from 'react';

import type { FuelStationFeature } from '../api/siphonClient';
import { PriceBadge } from './PriceBadge';

interface StationCardProps {
  station: FuelStationFeature;
  onPress?: (station: FuelStationFeature) => void;
}

const StationCardComponent: FC<StationCardProps> = ({ station, onPress }) => {
  const { name, brand, address, fuels } = station.properties;
  const entries = Object.entries(fuels ?? {});

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress?.(station)}
      style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#f4f4f5',
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700' }}>
        {brand || name || 'Unknown station'}
      </Text>
      <Text style={{ fontSize: 13, color: '#555' }}>{address}</Text>
      {entries.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 6,
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
