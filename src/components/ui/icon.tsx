import { useAppearanceSupport } from '../../hooks/useSupport';
import { useThemeTokens } from '../../hooks/useThemeTokens';

type IconProps = {
  name: string;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color }: IconProps) {
  const { iconSet } = useAppearanceSupport();
  const { colors } = useThemeTokens();
  return <>{iconSet.render({ name, size, color: color ?? colors.label })}</>;
}
