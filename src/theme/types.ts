import type { ui, station } from './tokens';

export type ColorScheme = 'light' | 'dark';

/** All UI color slot keys */
export type UIKeys = keyof typeof ui.light;

/** All station/pricing color slot keys */
export type StationKeys = keyof typeof station.light;

/** All color slot keys (ui + station combined) */
export type ColorSlot = UIKeys | StationKeys;

/** Flat merged color palette — all slots are strings (literals from const tokens are
 *  too narrow for palette overrides, so we widen to `string`). */
export type ThemeColors = Record<ColorSlot, string>;