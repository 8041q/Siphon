import { Text } from 'react-native';

import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Chip } from './chip';

type FilterButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  multiSelect?: boolean;
  transparent?: boolean;
};

/** Compact, content-sized choice. Labels can wrap for long translations. */
export function FilterButton({ label, ...props }: FilterButtonProps) {
  const { colors } = useThemeTokens();

  return (
    <Chip {...props} compact accessibilityLabel={props.accessibilityLabel ?? label}>
      <Text style={{ color: props.selected ? colors.labelOnTint : colors.secondaryLabel, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
        {label}
      </Text>
    </Chip>
  );
}
