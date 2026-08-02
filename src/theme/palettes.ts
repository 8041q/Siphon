import { ui, station } from './tokens';
import type { ColorScheme, ThemeColors } from './types';

export type Palette = Record<ColorScheme, ThemeColors>;

// ─── Default Palette ─────────────────────────────────────────────────────────

export const DEFAULT_PALETTE: Palette = {
  light: {
    ...ui.light,
    ...station.light,
  },
  dark: {
    ...ui.dark,
    ...station.dark,
  },
};

// ─── Midnight ────────────────────────────────────────────────────────────────

export const midnight: Palette = {
  light: {
    // ── Backgrounds ────────────────────────────────────────────────
    background: '#F4F7FB',
    groupedBackground: '#E8EEF6',
    surface: '#FFFFFF',
    sheet: '#FFFFFF',
    // ── Text ──────────────────────────────────────────────────────
    label: '#0B1B2B',
    secondaryLabel: 'rgba(11, 27, 43, 0.7)',
    tertiaryLabel: 'rgba(11, 27, 43, 0.55)',
    labelOnTint: '#FFFFFF',
    // ── Decorative ────────────────────────────────────────────────
    separator: 'rgba(11, 27, 43, 0.18)',
    tint: '#2563EB',
    destructive: '#DC2626',
    // ── Inputs ────────────────────────────────────────────────────
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(11, 27, 43, 0.18)',
    placeholder: 'rgba(11, 27, 43, 0.3)',
    // ── Sheet handle ──────────────────────────────────────────────
    handleIndicator: 'rgba(11, 27, 43, 0.3)',
    // ── Other ─────────────────────────────────────────────────────
    error: '#DC2626',
    // ── Map ───────────────────────────────────────────────────────
    pin: '#2563EB',
    pinStroke: 'rgba(255, 255, 255, 0.5)',
    // ── Price badges ─────────────────────────────────────────────
    priceLow: '#16A34A',
    priceLowTint: 'rgba(22, 163, 74, 0.1)',
    priceMid: '#D97706',
    priceHigh: '#DC2626',
    priceHighTint: 'rgba(220, 38, 38, 0.1)',
    // ── Worth the drive ──────────────────────────────────────────
    worthItText: '#16A34A',
    worthItBg: 'rgba(22, 163, 74, 0.1)',
    notWorthText: '#DC2626',
    notWorthBg: 'rgba(220, 38, 38, 0.1)',
    // ── Favorite ─────────────────────────────────────────────────
    favorite: '#FFD60A',
    // ── Charts ────────────────────────────────────────────────────
    chartLine: '#2563EB',
    chartGrid: 'rgba(11, 27, 43, 0.18)',
    chartLabel: 'rgba(11, 27, 43, 0.7)',
    chartDot: '#2563EB',
    // ── Radar ─────────────────────────────────────────────────────
    radarLine: '#2563EB',
    radarDot: 'rgba(11, 27, 43, 0.7)',
    radarBest: '#2563EB',
    radarGrid: 'rgba(11, 27, 43, 0.18)',
    radarLabel: 'rgba(11, 27, 43, 0.7)',
    // ── Day banner ────────────────────────────────────────────────
    dayBannerBg: '#34C759',
    dayBannerText: '#FFFFFF',
  },
  dark: {
    // ── Backgrounds ────────────────────────────────────────────────
    background: '#0B1424',
    groupedBackground: '#142036',
    surface: '#1C2A44',
    sheet: '#0B1424',
    // ── Text ──────────────────────────────────────────────────────
    label: '#EAF1FB',
    secondaryLabel: 'rgba(234, 241, 251, 0.75)',
    tertiaryLabel: 'rgba(234, 241, 251, 0.5)',
    labelOnTint: '#FFFFFF',
    // ── Decorative ────────────────────────────────────────────────
    separator: 'rgba(148, 163, 184, 0.45)',
    tint: '#60A5FA',
    destructive: '#F87171',
    // ── Inputs ────────────────────────────────────────────────────
    fieldBackground: '#1C2A44',
    fieldBorder: 'rgba(148, 163, 184, 0.45)',
    placeholder: 'rgba(234, 241, 251, 0.5)',
    // ── Sheet handle ──────────────────────────────────────────────
    handleIndicator: 'rgba(234, 241, 251, 0.5)',
    // ── Other ─────────────────────────────────────────────────────
    error: '#F87171',
    // ── Map ───────────────────────────────────────────────────────
    pin: '#60A5FA',
    pinStroke: 'rgba(255, 255, 255, 0.5)',
    // ── Price badges ─────────────────────────────────────────────
    priceLow: '#4ADE80',
    priceLowTint: 'rgba(74, 222, 128, 0.1)',
    priceMid: '#FBBF24',
    priceHigh: '#F87171',
    priceHighTint: 'rgba(248, 113, 113, 0.1)',
    // ── Worth the drive ──────────────────────────────────────────
    worthItText: '#4ADE80',
    worthItBg: 'rgba(74, 222, 128, 0.1)',
    notWorthText: '#F87171',
    notWorthBg: 'rgba(248, 113, 113, 0.1)',
    // ── Favorite ─────────────────────────────────────────────────
    favorite: '#FFD60A',
    // ── Charts ────────────────────────────────────────────────────
    chartLine: '#60A5FA',
    chartGrid: 'rgba(148, 163, 184, 0.45)',
    chartLabel: 'rgba(234, 241, 251, 0.75)',
    chartDot: '#60A5FA',
    // ── Radar ─────────────────────────────────────────────────────
    radarLine: '#60A5FA',
    radarDot: 'rgba(234, 241, 251, 0.75)',
    radarBest: '#60A5FA',
    radarGrid: 'rgba(148, 163, 184, 0.45)',
    radarLabel: 'rgba(234, 241, 251, 0.75)',
    // ── Day banner ────────────────────────────────────────────────
    dayBannerBg: '#30D158',
    dayBannerText: '#FFFFFF',
  },
};

// ─── Sunset ──────────────────────────────────────────────────────────────────

export const sunset: Palette = {
  light: {
    // ── Backgrounds ────────────────────────────────────────────────
    background: '#FDF8F4',
    groupedBackground: '#F7ECE3',
    surface: '#FFFFFF',
    sheet: '#FFFFFF',
    // ── Text ──────────────────────────────────────────────────────
    label: '#3B1D12',
    secondaryLabel: 'rgba(59, 29, 18, 0.7)',
    tertiaryLabel: 'rgba(59, 29, 18, 0.55)',
    labelOnTint: '#FFFFFF',
    // ── Decorative ────────────────────────────────────────────────
    separator: 'rgba(59, 29, 18, 0.18)',
    tint: '#E8590C',
    destructive: '#C92A2A',
    // ── Inputs ────────────────────────────────────────────────────
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(59, 29, 18, 0.18)',
    placeholder: 'rgba(59, 29, 18, 0.3)',
    // ── Sheet handle ──────────────────────────────────────────────
    handleIndicator: 'rgba(59, 29, 18, 0.3)',
    // ── Other ─────────────────────────────────────────────────────
    error: '#C92A2A',
    // ── Map ───────────────────────────────────────────────────────
    pin: '#E8590C',
    pinStroke: 'rgba(255, 255, 255, 0.5)',
    // ── Price badges ─────────────────────────────────────────────
    priceLow: '#2F9E44',
    priceLowTint: 'rgba(47, 158, 68, 0.1)',
    priceMid: '#E67700',
    priceHigh: '#C92A2A',
    priceHighTint: 'rgba(201, 42, 42, 0.1)',
    // ── Worth the drive ──────────────────────────────────────────
    worthItText: '#2F9E44',
    worthItBg: 'rgba(47, 158, 68, 0.1)',
    notWorthText: '#C92A2A',
    notWorthBg: 'rgba(201, 42, 42, 0.1)',
    // ── Favorite ─────────────────────────────────────────────────
    favorite: '#FFD60A',
    // ── Charts ────────────────────────────────────────────────────
    chartLine: '#E8590C',
    chartGrid: 'rgba(59, 29, 18, 0.18)',
    chartLabel: 'rgba(59, 29, 18, 0.7)',
    chartDot: '#E8590C',
    // ── Radar ─────────────────────────────────────────────────────
    radarLine: '#E8590C',
    radarDot: 'rgba(59, 29, 18, 0.7)',
    radarBest: '#E8590C',
    radarGrid: 'rgba(59, 29, 18, 0.18)',
    radarLabel: 'rgba(59, 29, 18, 0.7)',
    // ── Day banner ────────────────────────────────────────────────
    dayBannerBg: '#34C759',
    dayBannerText: '#FFFFFF',
  },
  dark: {
    // ── Backgrounds ────────────────────────────────────────────────
    background: '#25140C',
    groupedBackground: '#352017',
    surface: '#46291D',
    sheet: '#25140C',
    // ── Text ──────────────────────────────────────────────────────
    label: '#FDEBE0',
    secondaryLabel: 'rgba(253, 235, 224, 0.75)',
    tertiaryLabel: 'rgba(253, 235, 224, 0.5)',
    labelOnTint: '#FFFFFF',
    // ── Decorative ────────────────────────────────────────────────
    separator: 'rgba(240, 189, 165, 0.4)',
    tint: '#FF922B',
    destructive: '#FF8787',
    // ── Inputs ────────────────────────────────────────────────────
    fieldBackground: '#46291D',
    fieldBorder: 'rgba(240, 189, 165, 0.4)',
    placeholder: 'rgba(253, 235, 224, 0.5)',
    // ── Sheet handle ──────────────────────────────────────────────
    handleIndicator: 'rgba(253, 235, 224, 0.5)',
    // ── Other ─────────────────────────────────────────────────────
    error: '#FF8787',
    // ── Map ───────────────────────────────────────────────────────
    pin: '#FF922B',
    pinStroke: 'rgba(255, 255, 255, 0.5)',
    // ── Price badges ─────────────────────────────────────────────
    priceLow: '#69DB7C',
    priceLowTint: 'rgba(105, 219, 124, 0.1)',
    priceMid: '#FFD43B',
    priceHigh: '#FF8787',
    priceHighTint: 'rgba(255, 135, 135, 0.1)',
    // ── Worth the drive ──────────────────────────────────────────
    worthItText: '#69DB7C',
    worthItBg: 'rgba(105, 219, 124, 0.1)',
    notWorthText: '#FF8787',
    notWorthBg: 'rgba(255, 135, 135, 0.1)',
    // ── Favorite ─────────────────────────────────────────────────
    favorite: '#FFD60A',
    // ── Charts ────────────────────────────────────────────────────
    chartLine: '#FF922B',
    chartGrid: 'rgba(240, 189, 165, 0.4)',
    chartLabel: 'rgba(253, 235, 224, 0.75)',
    chartDot: '#FF922B',
    // ── Radar ─────────────────────────────────────────────────────
    radarLine: '#FF922B',
    radarDot: 'rgba(253, 235, 224, 0.75)',
    radarBest: '#FF922B',
    radarGrid: 'rgba(240, 189, 165, 0.4)',
    radarLabel: 'rgba(253, 235, 224, 0.75)',
    // ── Day banner ────────────────────────────────────────────────
    dayBannerBg: '#30D158',
    dayBannerText: '#FFFFFF',
  },
};

// ─── Forest ──────────────────────────────────────────────────────────────────

export const forest: Palette = {
  light: {
    // ── Backgrounds ────────────────────────────────────────────────
    background: '#F5FAF6',
    groupedBackground: '#E6F0E9',
    surface: '#FFFFFF',
    sheet: '#FFFFFF',
    // ── Text ──────────────────────────────────────────────────────
    label: '#12241A',
    secondaryLabel: 'rgba(18, 36, 26, 0.7)',
    tertiaryLabel: 'rgba(18, 36, 26, 0.55)',
    labelOnTint: '#FFFFFF',
    // ── Decorative ────────────────────────────────────────────────
    separator: 'rgba(18, 36, 26, 0.18)',
    tint: '#33a049',
    destructive: '#C92A2A',
    // ── Inputs ────────────────────────────────────────────────────
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(18, 36, 26, 0.18)',
    placeholder: 'rgba(18, 36, 26, 0.3)',
    // ── Sheet handle ──────────────────────────────────────────────
    handleIndicator: 'rgba(18, 36, 26, 0.3)',
    // ── Other ─────────────────────────────────────────────────────
    error: '#C92A2A',
    // ── Map ───────────────────────────────────────────────────────
    pin: '#2B8A3E',
    pinStroke: 'rgba(255, 255, 255, 0.5)',
    // ── Price badges ─────────────────────────────────────────────
    priceLow: '#2F9E44',
    priceLowTint: 'rgba(47, 158, 68, 0.1)',
    priceMid: '#B08900',
    priceHigh: '#C92A2A',
    priceHighTint: 'rgba(201, 42, 42, 0.1)',
    // ── Worth the drive ──────────────────────────────────────────
    worthItText: '#2F9E44',
    worthItBg: 'rgba(47, 158, 68, 0.1)',
    notWorthText: '#C92A2A',
    notWorthBg: 'rgba(201, 42, 42, 0.1)',
    // ── Favorite ─────────────────────────────────────────────────
    favorite: '#FFD60A',
    // ── Charts ────────────────────────────────────────────────────
    chartLine: '#2B8A3E',
    chartGrid: 'rgba(18, 36, 26, 0.18)',
    chartLabel: 'rgba(18, 36, 26, 0.7)',
    chartDot: '#2B8A3E',
    // ── Radar ─────────────────────────────────────────────────────
    radarLine: '#2B8A3E',
    radarDot: 'rgba(18, 36, 26, 0.7)',
    radarBest: '#2B8A3E',
    radarGrid: 'rgba(18, 36, 26, 0.18)',
    radarLabel: 'rgba(18, 36, 26, 0.7)',
    // ── Day banner ────────────────────────────────────────────────
    dayBannerBg: '#34C759',
    dayBannerText: '#FFFFFF',
  },
  dark: {
    // ── Backgrounds ────────────────────────────────────────────────
    background: '#0E1B13',
    groupedBackground: '#16271B',
    surface: '#1E3325',
    sheet: '#0E1B13',
    // ── Text ──────────────────────────────────────────────────────
    label: '#E9F5EC',
    secondaryLabel: 'rgba(233, 245, 236, 0.75)',
    tertiaryLabel: 'rgba(233, 245, 236, 0.5)',
    labelOnTint: '#FFFFFF',
    // ── Decorative ────────────────────────────────────────────────
    separator: 'rgba(155, 194, 165, 0.45)',
    tint: '#378d5e',
    destructive: '#FF8787',
    // ── Inputs ────────────────────────────────────────────────────
    fieldBackground: '#1E3325',
    fieldBorder: 'rgba(155, 194, 165, 0.45)',
    placeholder: 'rgba(233, 245, 236, 0.5)',
    // ── Sheet handle ──────────────────────────────────────────────
    handleIndicator: 'rgba(233, 245, 236, 0.5)',
    // ── Other ─────────────────────────────────────────────────────
    error: '#FF8787',
    // ── Map ───────────────────────────────────────────────────────
    pin: '#51CF66',
    pinStroke: 'rgba(255, 255, 255, 0.5)',
    // ── Price badges ─────────────────────────────────────────────
    priceLow: '#69DB7C',
    priceLowTint: 'rgba(105, 219, 124, 0.1)',
    priceMid: '#FFD43B',
    priceHigh: '#FF8787',
    priceHighTint: 'rgba(255, 135, 135, 0.1)',
    // ── Worth the drive ──────────────────────────────────────────
    worthItText: '#69DB7C',
    worthItBg: 'rgba(105, 219, 124, 0.1)',
    notWorthText: '#FF8787',
    notWorthBg: 'rgba(255, 135, 135, 0.1)',
    // ── Favorite ─────────────────────────────────────────────────
    favorite: '#FFD60A',
    // ── Charts ────────────────────────────────────────────────────
    chartLine: '#51CF66',
    chartGrid: 'rgba(155, 194, 165, 0.45)',
    chartLabel: 'rgba(233, 245, 236, 0.75)',
    chartDot: '#51CF66',
    // ── Radar ─────────────────────────────────────────────────────
    radarLine: '#51CF66',
    radarDot: 'rgba(233, 245, 236, 0.75)',
    radarBest: '#51CF66',
    radarGrid: 'rgba(155, 194, 165, 0.45)',
    radarLabel: 'rgba(233, 245, 236, 0.75)',
    // ── Day banner ────────────────────────────────────────────────
    dayBannerBg: '#30D158',
    dayBannerText: '#FFFFFF',
  },
};

// ─── Mono ────────────────────────────────────────────────────────────────────

export const mono: Palette = {
  light: {
    // ── Backgrounds ────────────────────────────────────────────────
    background: '#FAFAFA',
    groupedBackground: '#F0F0F0',
    surface: '#FFFFFF',
    sheet: '#FFFFFF',
    // ── Text ──────────────────────────────────────────────────────
    label: '#111111',
    secondaryLabel: 'rgba(17, 17, 17, 0.7)',
    tertiaryLabel: 'rgba(17, 17, 17, 0.55)',
    labelOnTint: '#FFFFFF',
    // ── Decorative ────────────────────────────────────────────────
    separator: 'rgba(17, 17, 17, 0.18)',
    tint: '#404040',
    destructive: '#B3261E',
    // ── Inputs ────────────────────────────────────────────────────
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(17, 17, 17, 0.18)',
    placeholder: 'rgba(17, 17, 17, 0.3)',
    // ── Sheet handle ──────────────────────────────────────────────
    handleIndicator: 'rgba(17, 17, 17, 0.3)',
    // ── Other ─────────────────────────────────────────────────────
    error: '#B3261E',
    // ── Map ───────────────────────────────────────────────────────
    pin: '#404040',
    pinStroke: 'rgba(255, 255, 255, 0.5)',
    // ── Price badges ─────────────────────────────────────────────
    priceLow: '#1C7C54',
    priceLowTint: 'rgba(28, 124, 84, 0.1)',
    priceMid: '#8A6D00',
    priceHigh: '#B3261E',
    priceHighTint: 'rgba(179, 38, 30, 0.1)',
    // ── Worth the drive ──────────────────────────────────────────
    worthItText: '#1C7C54',
    worthItBg: 'rgba(28, 124, 84, 0.1)',
    notWorthText: '#B3261E',
    notWorthBg: 'rgba(179, 38, 30, 0.1)',
    // ── Favorite ─────────────────────────────────────────────────
    favorite: '#FFD60A',
    // ── Charts ────────────────────────────────────────────────────
    chartLine: '#404040',
    chartGrid: 'rgba(17, 17, 17, 0.18)',
    chartLabel: 'rgba(17, 17, 17, 0.7)',
    chartDot: '#404040',
    // ── Radar ─────────────────────────────────────────────────────
    radarLine: '#404040',
    radarDot: 'rgba(17, 17, 17, 0.7)',
    radarBest: '#404040',
    radarGrid: 'rgba(17, 17, 17, 0.18)',
    radarLabel: 'rgba(17, 17, 17, 0.7)',
    // ── Day banner ────────────────────────────────────────────────
    dayBannerBg: '#34C759',
    dayBannerText: '#FFFFFF',
  },
  dark: {
    // ── Backgrounds ────────────────────────────────────────────────
    background: '#111111',
    groupedBackground: '#1B1B1B',
    surface: '#262626',
    sheet: '#111111',
    // ── Text ──────────────────────────────────────────────────────
    label: '#F5F5F5',
    secondaryLabel: 'rgba(245, 245, 245, 0.75)',
    tertiaryLabel: 'rgba(245, 245, 245, 0.5)',
    labelOnTint: '#FFFFFF',
    // ── Decorative ────────────────────────────────────────────────
    separator: 'rgba(163, 163, 163, 0.5)',
    tint: '#D4D4D4',
    destructive: '#FF8A80',
    // ── Inputs ────────────────────────────────────────────────────
    fieldBackground: '#262626',
    fieldBorder: 'rgba(163, 163, 163, 0.5)',
    placeholder: 'rgba(245, 245, 245, 0.5)',
    // ── Sheet handle ──────────────────────────────────────────────
    handleIndicator: 'rgba(245, 245, 245, 0.5)',
    // ── Other ─────────────────────────────────────────────────────
    error: '#FF8A80',
    // ── Map ───────────────────────────────────────────────────────
    pin: '#D4D4D4',
    pinStroke: 'rgba(255, 255, 255, 0.5)',
    // ── Price badges ─────────────────────────────────────────────
    priceLow: '#4ADE80',
    priceLowTint: 'rgba(74, 222, 128, 0.1)',
    priceMid: '#FFD43B',
    priceHigh: '#FF8A80',
    priceHighTint: 'rgba(255, 138, 128, 0.1)',
    // ── Worth the drive ──────────────────────────────────────────
    worthItText: '#4ADE80',
    worthItBg: 'rgba(74, 222, 128, 0.1)',
    notWorthText: '#FF8A80',
    notWorthBg: 'rgba(255, 138, 128, 0.1)',
    // ── Favorite ─────────────────────────────────────────────────
    favorite: '#FFD60A',
    // ── Charts ────────────────────────────────────────────────────
    chartLine: '#D4D4D4',
    chartGrid: 'rgba(163, 163, 163, 0.5)',
    chartLabel: 'rgba(245, 245, 245, 0.75)',
    chartDot: '#D4D4D4',
    // ── Radar ─────────────────────────────────────────────────────
    radarLine: '#D4D4D4',
    radarDot: 'rgba(245, 245, 245, 0.75)',
    radarBest: '#D4D4D4',
    radarGrid: 'rgba(163, 163, 163, 0.5)',
    radarLabel: 'rgba(245, 245, 245, 0.75)',
    // ── Day banner ────────────────────────────────────────────────
    dayBannerBg: '#30D158',
    dayBannerText: '#FFFFFF',
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