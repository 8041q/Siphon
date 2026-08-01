import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type ListItemProps = {
  children: ReactNode;
  onPress?: () => void;
  trailing?: ReactNode;
};

export function ListItem({ children, onPress, trailing }: ListItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      className="flex-row items-center justify-between px-lg py-md bg-surface dark:bg-surface-dark"
    >
      <View className="flex-1 mr-md">
        {typeof children === 'string' ? (
          <Text className="text-body text-label dark:text-label-dark">{children}</Text>
        ) : (
          children
        )}
      </View>
      {trailing != null && (
        <View className="flex-shrink items-end">
          {typeof trailing === 'string' ? (
            <Text className="text-body text-secondary-label dark:text-secondary-label-dark">{trailing}</Text>
          ) : (
            trailing
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
