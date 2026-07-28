import { memo } from 'react';
import { Text, View } from 'react-native';
import { fuelLabel } from '../utils/fuelNames';

interface PriceBadgeProps {
  fuel: string;
  price: number;
}

const PriceBadgeComponent = ({ fuel, price }: PriceBadgeProps) => {
  return (
    <View
      style={{
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600' }}>
        {fuelLabel(fuel)}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#166534' }}>
        {price.toFixed(3)} €
      </Text>
    </View>
  );
}

export const PriceBadge = memo(PriceBadgeComponent);
