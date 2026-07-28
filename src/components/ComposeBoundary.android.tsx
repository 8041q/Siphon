import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { Host } from '@expo/ui/jetpack-compose';

export function ComposeBoundary({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <Host style={style}>
      {children}
    </Host>
  );
}