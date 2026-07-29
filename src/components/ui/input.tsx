import { TextInput } from 'react-native';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
};

export function Input({ value, onChangeText, placeholder, className = '' }: InputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(60, 60, 67, 0.3)"
      className={`flex-1 px-1 ${className}`}
    />
  );
}
