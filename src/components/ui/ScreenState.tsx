import { Text, View } from 'react-native';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Button } from './button';

export function ScreenState({ message, detail, action, onAction, error = false }: {
  message: string; detail?: string; action?: string; onAction?: () => void; error?: boolean;
}) {
  const { colors } = useThemeTokens();
  return (
    <View className="flex-1 items-center justify-center px-xl py-lg gap-md" accessibilityLiveRegion={error ? 'assertive' : 'polite'}>
      <Text className="text-body text-center" style={{ color: colors.secondaryLabel }}>{message}</Text>
      {detail && <Text className="text-footnote text-center" style={{ color: colors.tertiaryLabel }}>{detail}</Text>}
      {action && onAction && <Button onPress={onAction}>{action}</Button>}
    </View>
  );
}
