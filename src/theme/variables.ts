import type { Palette } from './palettes';
import type { ColorSlot } from './types';

const COLOR_SLOTS = [
  // ── UI background ───────────────────────────────────────────────
  'background',
  'grouped-background',
  'surface',
  'sheet',
  // ── Text ────────────────────────────────────────────────────────
  'label',
  'secondary-label',
  'tertiary-label',
  'label-on-tint',
  // ── Decorative ─────────────────────────────────────────────────
  'separator',
  'tint',
  'destructive',
  // ── Inputs ─────────────────────────────────────────────────────
  'field-background',
  'field-border',
  'placeholder',
  // ── Sheet indicator ────────────────────────────────────────────
  'handle-indicator',
  // ── Other ──────────────────────────────────────────────────────
  'error',
  // ── Map ────────────────────────────────────────────────────────
  'pin',
  'pin-stroke',
  // ── Price badges ───────────────────────────────────────────────
  'price-low',
  'price-low-tint',
  'price-mid',
  'price-high',
  'price-high-tint',
  // ── Worth the drive ────────────────────────────────────────────
  'worth-it-text',
  'worth-it-bg',
  'not-worth-text',
  'not-worth-bg',
  // ── Favorite ───────────────────────────────────────────────────
  'favorite',
  // ── Charts ─────────────────────────────────────────────────────
  'chart-line',
  'chart-grid',
  'chart-label',
  'chart-dot',
  // ── Radar ──────────────────────────────────────────────────────
  'radar-line',
  'radar-dot',
  'radar-best',
  'radar-grid',
  'radar-label',
  // ── Day banner ─────────────────────────────────────────────────
  'day-banner-bg',
  'day-banner-text',
] as const;

export type PaletteVariables = Record<string, string>;

export function paletteToVariables(palette: Palette): PaletteVariables {
  const vars: PaletteVariables = {};
  for (const slot of COLOR_SLOTS) {
    const camel = slot.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    vars[`--color-${slot}`] = palette.light[camel as ColorSlot];
    vars[`--color-${slot}-dark`] = palette.dark[camel as ColorSlot];
  }
  return vars;
}

export function paletteBackgroundColor(palette: Palette, isDark: boolean): string {
  return isDark ? palette.dark.background : palette.light.background;
}