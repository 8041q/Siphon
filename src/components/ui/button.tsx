import type { ReactNode } from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

type ButtonProps = {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  className = '',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const bg = variant === 'primary' ? 'bg-tint' : 'bg-transparent';
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-md py-md px-lg items-center justify-center ${bg} ${className} ${disabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : typeof children === 'string' ? (
        <Text className="text-white font-semibold text-callout">{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
