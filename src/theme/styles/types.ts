import type { ViewStyle } from 'react-native';

export type StyleSetId = 'default' | 'liquid-glass' | 'dotted' | 'retro';

export type ComponentRules = {
  borderRadius?: number;
  borderStyle?: ViewStyle['borderStyle'];
  borderWidth?: number;
  opacity?: number;
  /** When true, the surface renders a glassmorphism backdrop (blur + translucent tint)
   *  instead of a flat opacity fade. */
  glass?: boolean;
};

export type StyleRules = {
  card: ComponentRules;
  button: ComponentRules;
  input: ComponentRules;
  badge: ComponentRules;
  listItem: ComponentRules;
  sheet: ComponentRules;
  stationCard: ComponentRules;
  chip: ComponentRules;
  banner: ComponentRules;
};

export type StyleSetMap = Record<StyleSetId, StyleRules>;