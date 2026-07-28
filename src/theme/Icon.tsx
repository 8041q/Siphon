import { Platform, Text } from 'react-native';
import { memo } from 'react';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';

type IconProps = {
  sf?: SFSymbol;
  md?: string;
  size?: number;
  color?: string;
};

const MATERIAL_GLYPH: Record<string, string> = {
  search: '\u{1F50D}',
  star: '\u2B50',
  star_border: '\u2606',
  map: '\u{1F5FA}',
  list: '\u{1F4CB}',
  settings: '\u2699\uFE0F',
  my_location: '\u{1F4CD}',
  filter_list: '\u{1F3F7}\uFE0F',
  directions: '\u27A1\uFE0F',
  local_gas_station: '\u26FD',
};

export const Icon = memo(({ sf, md, size = 24, color }: IconProps) => {
  if (Platform.OS === 'ios' && sf) {
    return (
      <SymbolView
        name={sf}
        size={size}
        tintColor={color}
        style={{ width: size, height: size }}
      />
    );
  }

  if (Platform.OS === 'android' && md) {
    const glyph = MATERIAL_GLYPH[md];
    if (glyph) {
      return (
        <Text style={{ fontSize: size, color, width: size, textAlign: 'center' }}>
          {glyph}
        </Text>
      );
    }
  }

  return null;
});

Icon.displayName = 'Icon';