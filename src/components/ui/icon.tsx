import { useAppearanceSupport } from '../../hooks/useSupport';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { View } from 'react-native';

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  filled?: boolean;
};

export function Icon({ name, size = 24, color, filled }: IconProps) {
  const { iconSet } = useAppearanceSupport();
  const { colors } = useThemeTokens();
  return <View collapsable={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{iconSet.render({ name, size, color: color ?? colors.label, filled })}</View>;
}
