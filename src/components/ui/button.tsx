import type { ReactNode } from 'react';
import { TouchableOpacity, Text } from 'react-native';

type ButtonProps = {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  className?: string;
};

export function Button({ children, onPress, variant = 'primary', className = '' }: ButtonProps) {
  const bg = variant === 'primary' ? 'bg-tint' : 'bg-transparent';
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`rounded-md py-md px-lg items-center justify-center ${bg} ${className}`}
    >
      {typeof children === 'string' ? (
        <Text className="text-white font-semibold text-callout">{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
