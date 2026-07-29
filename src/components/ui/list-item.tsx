import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type ListItemProps = {
  children: ReactNode;
  onPress?: () => void;
  trailing?: string;
};

export function ListItem({ children, onPress, trailing }: ListItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      className="flex-row items-center justify-between px-lg py-md bg-surface"
    >
      {typeof children === 'string' ? (
        <Text className="text-body text-label">{children}</Text>
      ) : (
        children
      )}
      {trailing && (
        <Text className="text-body text-secondary-label">{trailing}</Text>
      )}
    </TouchableOpacity>
  );
}
