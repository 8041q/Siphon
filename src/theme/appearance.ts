import type { Palette } from './palettes';
import type { StyleSetId } from './styles/types';
import type { ThemeColors } from './types';

/** Resolve surface roles without changing fuel/reference calculations or colors. */
export function appearancePalette(palette: Palette, style: StyleSetId): Palette {
  if (style === 'default') return palette;
  const resolve = (colors: ThemeColors, dark: boolean): ThemeColors => ({
    ...colors,
    // The original teal needs a deeper shade on neutral and softly tinted fields.
    tint: !dark && colors.tint === '#08798B' ? '#066B7A' : colors.tint,
    background: dark ? '#121619' : '#F5F6F7',
    groupedBackground: dark ? '#191E23' : '#ECEFF1',
    surface: dark ? '#1D2227' : '#FFFFFF',
    sheet: dark ? '#1D2227' : '#FFFFFF',
    label: dark ? '#EFF2F4' : '#192127',
    secondaryLabel: dark ? '#AEB7BF' : '#5E6872',
    tertiaryLabel: dark ? '#AEB7BF' : '#5E6872',
    separator: dark ? '#353C43' : '#DFE3E6',
    fieldBackground: dark ? '#191E23' : '#ECEFF1',
    fieldBorder: dark ? '#353C43' : '#DFE3E6',
    placeholder: dark ? '#AEB7BF' : '#5E6872',
    handleIndicator: dark ? '#AEB7BF' : '#5E6872',
    chartGrid: dark ? '#353C43' : '#DFE3E6',
    chartLabel: dark ? '#AEB7BF' : '#5E6872',
    radarGrid: dark ? '#353C43' : '#DFE3E6',
    radarLabel: dark ? '#AEB7BF' : '#5E6872',
  });
  return { light: resolve(palette.light, false), dark: resolve(palette.dark, true) };
}

/** A solid accent makes selection distinct from pale grouped surfaces. */
export function selectionBackground(colors: ThemeColors): string {
  return colors.tint;
}
