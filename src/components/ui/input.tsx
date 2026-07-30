import { useColorScheme } from 'nativewind';
import { TextInput } from 'react-native';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
};

export function Input({ value, onChangeText, placeholder, className = '' }: InputProps) {
  const { colorScheme } = useColorScheme();
  const placeholderColor = colorScheme === 'dark' ? 'rgba(235, 235, 245, 0.5)' : 'rgba(60, 60, 67, 0.3)';

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      className={`flex-1 px-1 ${className}`}
    />
  );
}
