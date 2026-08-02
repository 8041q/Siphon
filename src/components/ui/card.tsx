import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  const { colors } = useThemeTokens();

  return (
    <View style={{ backgroundColor: colors.groupedBackground }} className={`rounded-md p-md ${className}`}>
      {children}
    </View>
  );
}