import type { Palette } from './palettes';

const COLOR_SLOTS = [
  'background',
  'grouped-background',
  'surface',
  'label',
  'secondary-label',
  'tertiary-label',
  'separator',
  'tint',
  'price-low',
  'price-low-tint',
  'price-mid',
  'price-high',
  'price-high-tint',
  'destructive',
  'field-background',
  'field-border',
] as const;

export type PaletteVariables = Record<string, string>;

export function paletteToVariables(palette: Palette): PaletteVariables {
  const vars: PaletteVariables = {};
  for (const slot of COLOR_SLOTS) {
    const camel = slot.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    vars[`--color-${slot}`] = palette.light[camel as keyof typeof palette.light];
    vars[`--color-${slot}-dark`] = palette.dark[camel as keyof typeof palette.dark];
  }
  return vars;
}

export function paletteBackgroundColor(palette: Palette, isDark: boolean): string {
  return isDark ? palette.dark.background : palette.light.background;
}
