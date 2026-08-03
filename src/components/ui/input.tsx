import { TextInput } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules } from '../../hooks/useStyleConfig';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
};

export function Input({ value, onChangeText, placeholder, className = '' }: InputProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'input');

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      style={applyComponentRules(rules)}
      className={`flex-1 px-1 ${className}`}
    />
  );
}