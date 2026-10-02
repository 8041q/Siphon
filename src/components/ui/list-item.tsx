import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useSupport } from '../../hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass, componentSurface } from '../../hooks/useStyleConfig';
import { GlassBackdrop } from './glass';

type ListItemProps = {
  children: ReactNode;
  onPress?: () => void;
  trailing?: ReactNode;
};

export function ListItem({ children, onPress, trailing }: ListItemProps) {
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'listItem');
  const glass = isGlass(rules);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[{ minHeight: 44, backgroundColor: glass ? 'transparent' : componentSurface(rules, colors, 'surface') }, applyComponentRules(rules, colors.separator)]}
      className="flex-row items-center justify-between px-lg py-md"
    >
      {glass && <GlassBackdrop color={colors.surface} borderRadius={rules.borderRadius} />}
      <View className="flex-1 mr-md">
        {typeof children === 'string' ? (
          <Text style={{ color: colors.label }} className="text-body">{children}</Text>
        ) : (
          children
        )}
      </View>
      {trailing != null && (
        <View className="flex-shrink items-end">
          {typeof trailing === 'string' ? (
            <Text style={{ color: colors.secondaryLabel }} className="text-body">{trailing}</Text>
          ) : (
            trailing
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
