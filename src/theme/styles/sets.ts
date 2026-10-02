import type { StyleRules, StyleSetId } from './types';

const ROUND: StyleRules = {
  card: {}, button: {}, input: {}, badge: {}, listItem: {}, sheet: {},
  stationCard: {}, chip: {}, banner: {}, tabBar: { borderRadius: 32 },
};
const QUIET: StyleRules = {
  card: { borderRadius: 16, surface: 'surface' },
  button: { borderRadius: 12 }, input: { borderRadius: 10 },
  badge: { borderRadius: 8 }, listItem: {}, sheet: { borderRadius: 24 },
  stationCard: { borderRadius: 16, surface: 'surface' },
  chip: { borderRadius: 12 }, banner: { borderRadius: 12 },
  tabBar: { borderRadius: 32 },
};
const FROSTED: StyleRules = {
  ...QUIET,
  // Material belongs to overlays; content and data remain opaque.
  stationCard: { ...QUIET.stationCard, borderWidth: 1 },
  sheet: { glass: true, borderRadius: 24 },
  tabBar: { glass: true, borderRadius: 32, borderWidth: 1 },
};
export const DEFAULT_STYLE_SET: StyleSetId = 'quiet';

export const STYLE_SETS: Record<StyleSetId, StyleRules> = {
  default: ROUND, quiet: QUIET, frosted: FROSTED,
};
export const STYLE_SET_ORDER: StyleSetId[] = [DEFAULT_STYLE_SET, 'default', 'frosted'];

export function normalizeStyleSet(value: string | null): StyleSetId {
  if (value === 'liquid-glass') return 'frosted';
  if (value === 'retro' || value === 'instrument') return 'quiet';
  if (value === 'dotted') return 'quiet';
  return value && Object.hasOwn(STYLE_SETS, value) ? value as StyleSetId : DEFAULT_STYLE_SET;
}
export function getStyleSet(id: string): StyleRules {
  return STYLE_SETS[normalizeStyleSet(id)];
}
