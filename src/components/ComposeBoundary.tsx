import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ComposeBoundary({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView style={style}>
      {children}
    </SafeAreaView>
  );
}