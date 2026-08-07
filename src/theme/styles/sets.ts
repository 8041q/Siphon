import type { StyleRules, StyleSetId, StyleSetMap } from './types';

const DEFAULT_RULES: StyleRules = {
  card: {},
  button: {},
  input: {},
  badge: {},
  listItem: {},
  sheet: {},
  stationCard: {},
  chip: {},
  banner: {},
  tabBar: { borderRadius: 32 },
};

const LIQUID_GLASS: StyleRules = {
  card: { glass: true, borderRadius: 16 },
  button: { borderRadius: 24 },
  input: { glass: true, borderRadius: 12 },
  badge: { glass: true, borderRadius: 8 },
  listItem: { glass: true },
  sheet: { glass: true, borderRadius: 20 },
  stationCard: { glass: true, borderRadius: 16 },
  chip: { glass: true, borderRadius: 20 },
  banner: { borderRadius: 12 },
  tabBar: { glass: true, borderRadius: 32 },
};

const DOTTED: StyleRules = {
  card: { borderStyle: 'dotted', borderWidth: 1.5, borderRadius: 8 },
  button: { borderStyle: 'dotted', borderWidth: 1.5, borderRadius: 8 },
  input: { borderStyle: 'dotted', borderWidth: 1.5, borderRadius: 8 },
  badge: { borderStyle: 'dotted', borderWidth: 1, borderRadius: 4 },
  listItem: { borderStyle: 'dotted', borderWidth: 0.5 },
  sheet: { borderStyle: 'dotted', borderWidth: 1, borderRadius: 12 },
  stationCard: { borderStyle: 'dotted', borderWidth: 1.5, borderRadius: 8 },
  chip: { borderStyle: 'dotted', borderWidth: 1, borderRadius: 20 },
  banner: { borderStyle: 'dotted', borderWidth: 1, borderRadius: 8 },
  tabBar: { borderStyle: 'dotted', borderWidth: 1.5, borderRadius: 28 },
};

const RETRO: StyleRules = {
  card: { borderRadius: 4, borderStyle: 'dashed', borderWidth: 2 },
  button: { borderRadius: 2, borderStyle: 'dashed', borderWidth: 2 },
  input: { borderRadius: 2, borderStyle: 'dashed', borderWidth: 2 },
  badge: { borderRadius: 2, borderStyle: 'dashed', borderWidth: 1.5 },
  listItem: { borderStyle: 'dashed', borderWidth: 0.5 },
  sheet: { borderRadius: 4, borderStyle: 'dashed', borderWidth: 2 },
  stationCard: { borderRadius: 4, borderStyle: 'dashed', borderWidth: 2 },
  chip: { borderRadius: 4, borderStyle: 'dashed', borderWidth: 1.5 },
  banner: { borderRadius: 4, borderStyle: 'dashed', borderWidth: 2 },
  tabBar: { borderRadius: 12, borderStyle: 'dashed', borderWidth: 2 },
};

export const STYLE_SETS: Record<StyleSetId, StyleRules> = {
  default: DEFAULT_RULES,
  'liquid-glass': LIQUID_GLASS,
  dotted: DOTTED,
  retro: RETRO,
};

export const STYLE_SET_ORDER: StyleSetId[] = [
  'default',
  'liquid-glass',
  'dotted',
  'retro',
];

export function getStyleSet(id: StyleSetId): StyleRules {
  return STYLE_SETS[id] ?? DEFAULT_RULES;
}