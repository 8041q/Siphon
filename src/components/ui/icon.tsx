import { useSupport } from '../../hooks/useSupport';

type IconProps = {
  name: string;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color }: IconProps) {
  const { iconSet } = useSupport();
  return <>{iconSet.render({ name, size, color })}</>;
}
