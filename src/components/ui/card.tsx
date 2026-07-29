import type { ReactNode } from 'react';
import { View } from 'react-native';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <View className={`bg-grouped-background rounded-md p-md ${className}`}>
      {children}
    </View>
  );
}
