import { Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import type { KeyboardTypeOptions } from 'react-native';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function Field({ label, value, onChangeText, placeholder, error, keyboardType = 'default', autoCapitalize = 'sentences' }: FieldProps) {
  const { colorScheme } = useColorScheme();
  const placeholderColor = colorScheme === 'dark' ? 'rgba(235, 235, 245, 0.5)' : 'rgba(60, 60, 67, 0.3)';

  return (
    <View>
      <Text className="text-footnote text-secondary-label dark:text-secondary-label-dark uppercase tracking-wide mb-sm">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className="bg-field-background dark:bg-field-background-dark border border-field-border dark:border-field-border-dark rounded-md px-3 py-2 text-body text-label dark:text-label-dark"
      />
      {error ? (
        <Text className="text-footnote text-destructive dark:text-destructive-dark mt-xs">{error}</Text>
      ) : null}
    </View>
  );
}
