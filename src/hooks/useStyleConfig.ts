import { Platform, type ViewStyle } from 'react-native';
import type { ComponentRules, StyleRules } from '../theme/styles';

export function useStyleConfig(rules: StyleRules, component: keyof StyleRules): ComponentRules {
  return rules[component] ?? {};
}

/** True when the given surface should render a glassmorphism backdrop. */
export function isGlass(rules: ComponentRules): boolean {
  return rules.glass === true;
}

/**
 * Shape/border overrides to merge into a surface's inline style.
 * `opacity` is intentionally excluded when `glass` is active - glass surfaces
 * handle transparency via a blur backdrop, not a whole-view opacity fade that
 * would also fade the text/children.
 */
export function applyComponentRules(rules: ComponentRules, borderColor?: string): ViewStyle {
  const style: ViewStyle = {};
  if (rules.borderRadius !== undefined) style.borderRadius = rules.borderRadius;
  if (rules.borderStyle !== undefined) {
    style.borderStyle = rules.borderStyle;
    if (borderColor) style.borderColor = borderColor;
  }
  if (rules.borderWidth !== undefined) style.borderWidth = rules.borderWidth;
  if (rules.opacity !== undefined && !rules.glass) style.opacity = rules.opacity;
  // Android can clip away children when a rounded view changes its border or
  // background (for example, when switching from Retro to Liquid Glass).
  // Clip the backdrop itself there, keeping text and controls outside that mask.
  if (rules.glass) {
    style.overflow = Platform.OS === 'android' ? 'visible' : 'hidden';
    // Keep the negative-z backdrop within this surface's stacking context.
    style.isolation = 'isolate';
  }
  return style;
}
