import { TextInput } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
};

export function Input({ value, onChangeText, placeholder, className = '' }: InputProps) {
  const { colors } = useThemeTokens();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      className={`flex-1 px-1 ${className}`}
    />
  );
}