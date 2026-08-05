import { Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../../hooks/useStyleConfig';
import { GlassBackdrop } from './glass';

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
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'input');
  const glass = isGlass(rules);

  return (
    <View>
      <Text style={{ color: colors.secondaryLabel }} className="text-footnote uppercase tracking-wide mb-sm">
        {label}
      </Text>
      <View style={glass ? applyComponentRules(rules) : undefined}>
        {glass && <GlassBackdrop color={colors.fieldBackground} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[
            { backgroundColor: glass ? 'transparent' : colors.fieldBackground, borderColor: colors.fieldBorder, color: colors.label },
            glass ? undefined : applyComponentRules(rules),
          ]}
          className="rounded-md px-3 py-2 text-body"
        />
      </View>
      {error ? (
        <Text style={{ color: colors.error }} className="text-footnote mt-xs">{error}</Text>
      ) : null}
    </View>
  );
}