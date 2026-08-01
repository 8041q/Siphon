import { tokens } from './tokens';
import type { ColorScheme, ThemeColors } from './types';

export type Palette = Record<ColorScheme, ThemeColors>;

export const DEFAULT_PALETTE: Palette = {
  light: tokens.color.light,
  dark: tokens.color.dark,
};

export const midnight: Palette = {
  light: {
    background: '#F4F7FB',
    groupedBackground: '#E8EEF6',
    surface: '#FFFFFF',
    label: '#0B1B2B',
    secondaryLabel: 'rgba(11, 27, 43, 0.7)',
    tertiaryLabel: 'rgba(11, 27, 43, 0.55)',
    separator: 'rgba(11, 27, 43, 0.18)',
    tint: '#2563EB',
    priceLow: '#16A34A',
    priceLowTint: 'rgba(22, 163, 74, 0.1)',
    priceMid: '#D97706',
    priceHigh: '#DC2626',
    priceHighTint: 'rgba(220, 38, 38, 0.1)',
    destructive: '#DC2626',
    error: '#DC2626',
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(11, 27, 43, 0.18)',
  },
  dark: {
    background: '#0B1424',
    groupedBackground: '#142036',
    surface: '#1C2A44',
    label: '#EAF1FB',
    secondaryLabel: 'rgba(234, 241, 251, 0.75)',
    tertiaryLabel: 'rgba(234, 241, 251, 0.5)',
    separator: 'rgba(148, 163, 184, 0.45)',
    tint: '#60A5FA',
    priceLow: '#4ADE80',
    priceLowTint: 'rgba(74, 222, 128, 0.1)',
    priceMid: '#FBBF24',
    priceHigh: '#F87171',
    priceHighTint: 'rgba(248, 113, 113, 0.1)',
    destructive: '#F87171',
    error: '#F87171',
    fieldBackground: '#1C2A44',
    fieldBorder: 'rgba(148, 163, 184, 0.45)',
  },
};

export const sunset: Palette = {
  light: {
    background: '#FDF8F4',
    groupedBackground: '#F7ECE3',
    surface: '#FFFFFF',
    label: '#3B1D12',
    secondaryLabel: 'rgba(59, 29, 18, 0.7)',
    tertiaryLabel: 'rgba(59, 29, 18, 0.55)',
    separator: 'rgba(59, 29, 18, 0.18)',
    tint: '#E8590C',
    priceLow: '#2F9E44',
    priceLowTint: 'rgba(47, 158, 68, 0.1)',
    priceMid: '#E67700',
    priceHigh: '#C92A2A',
    priceHighTint: 'rgba(201, 42, 42, 0.1)',
    destructive: '#C92A2A',
    error: '#C92A2A',
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(59, 29, 18, 0.18)',
  },
  dark: {
    background: '#25140C',
    groupedBackground: '#352017',
    surface: '#46291D',
    label: '#FDEBE0',
    secondaryLabel: 'rgba(253, 235, 224, 0.75)',
    tertiaryLabel: 'rgba(253, 235, 224, 0.5)',
    separator: 'rgba(240, 189, 165, 0.4)',
    tint: '#FF922B',
    priceLow: '#69DB7C',
    priceLowTint: 'rgba(105, 219, 124, 0.1)',
    priceMid: '#FFD43B',
    priceHigh: '#FF8787',
    priceHighTint: 'rgba(255, 135, 135, 0.1)',
    destructive: '#FF8787',
    error: '#FF8787',
    fieldBackground: '#46291D',
    fieldBorder: 'rgba(240, 189, 165, 0.4)',
  },
};

export const forest: Palette = {
  light: {
    background: '#F5FAF6',
    groupedBackground: '#E6F0E9',
    surface: '#FFFFFF',
    label: '#12241A',
    secondaryLabel: 'rgba(18, 36, 26, 0.7)',
    tertiaryLabel: 'rgba(18, 36, 26, 0.55)',
    separator: 'rgba(18, 36, 26, 0.18)',
    tint: '#2B8A3E',
    priceLow: '#2F9E44',
    priceLowTint: 'rgba(47, 158, 68, 0.1)',
    priceMid: '#B08900',
    priceHigh: '#C92A2A',
    priceHighTint: 'rgba(201, 42, 42, 0.1)',
    destructive: '#C92A2A',
    error: '#C92A2A',
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(18, 36, 26, 0.18)',
  },
  dark: {
    background: '#0E1B13',
    groupedBackground: '#16271B',
    surface: '#1E3325',
    label: '#E9F5EC',
    secondaryLabel: 'rgba(233, 245, 236, 0.75)',
    tertiaryLabel: 'rgba(233, 245, 236, 0.5)',
    separator: 'rgba(155, 194, 165, 0.45)',
    tint: '#51CF66',
    priceLow: '#69DB7C',
    priceLowTint: 'rgba(105, 219, 124, 0.1)',
    priceMid: '#FFD43B',
    priceHigh: '#FF8787',
    priceHighTint: 'rgba(255, 135, 135, 0.1)',
    destructive: '#FF8787',
    error: '#FF8787',
    fieldBackground: '#1E3325',
    fieldBorder: 'rgba(155, 194, 165, 0.45)',
  },
};

export const mono: Palette = {
  light: {
    background: '#FAFAFA',
    groupedBackground: '#F0F0F0',
    surface: '#FFFFFF',
    label: '#111111',
    secondaryLabel: 'rgba(17, 17, 17, 0.7)',
    tertiaryLabel: 'rgba(17, 17, 17, 0.55)',
    separator: 'rgba(17, 17, 17, 0.18)',
    tint: '#404040',
    priceLow: '#1C7C54',
    priceLowTint: 'rgba(28, 124, 84, 0.1)',
    priceMid: '#8A6D00',
    priceHigh: '#B3261E',
    priceHighTint: 'rgba(179, 38, 30, 0.1)',
    destructive: '#B3261E',
    error: '#B3261E',
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(17, 17, 17, 0.18)',
  },
  dark: {
    background: '#111111',
    groupedBackground: '#1B1B1B',
    surface: '#262626',
    label: '#F5F5F5',
    secondaryLabel: 'rgba(245, 245, 245, 0.75)',
    tertiaryLabel: 'rgba(245, 245, 245, 0.5)',
    separator: 'rgba(163, 163, 163, 0.5)',
    tint: '#D4D4D4',
    priceLow: '#4ADE80',
    priceLowTint: 'rgba(74, 222, 128, 0.1)',
    priceMid: '#FFD43B',
    priceHigh: '#FF8A80',
    priceHighTint: 'rgba(255, 138, 128, 0.1)',
    destructive: '#FF8A80',
    error: '#FF8A80',
    fieldBackground: '#262626',
    fieldBorder: 'rgba(163, 163, 163, 0.5)',
  },
};

export type PaletteId = 'default' | 'midnight' | 'sunset' | 'forest' | 'mono';

export const PALETTES: Record<PaletteId, Palette> = {
  default: DEFAULT_PALETTE,
  midnight,
  sunset,
  forest,
  mono,
};

export const PALETTE_ORDER: PaletteId[] = [
  'default',
  'midnight',
  'sunset',
  'forest',
  'mono',
];

export function getPalette(id: string): Palette {
  return PALETTES[id as PaletteId] ?? DEFAULT_PALETTE;
}
