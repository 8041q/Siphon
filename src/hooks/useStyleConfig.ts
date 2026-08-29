import type { ComponentRules, StyleRules } from '../theme/styles';

export function useStyleConfig(rules: StyleRules, component: keyof StyleRules): ComponentRules {
  return rules[component] ?? {};
}

/** True when the given surface should render a glassmorphism backdrop. */
export function isGlass(rules: ComponentRules): boolean {
  return !!rules.glass;
}

/**
 * Shape/border overrides to merge into a surface's inline style.
 * `opacity` is intentionally excluded when `glass` is active — glass surfaces
 * handle transparency via a blur backdrop, not a whole-view opacity fade that
 * would also fade the text/children.
 *
 * `borderColor` is applied whenever a `borderStyle` is present so that
 * retro / dotted borders are visible across every palette + dark mode.
 */
export function applyComponentRules(rules: ComponentRules, borderColor?: string): Record<string, any> {
  const style: Record<string, any> = {};
  if (rules.borderRadius !== undefined) style.borderRadius = rules.borderRadius;
  if (rules.borderStyle !== undefined) {
    style.borderStyle = rules.borderStyle;
    if (borderColor) style.borderColor = borderColor;
  }
  if (rules.borderWidth !== undefined) style.borderWidth = rules.borderWidth;
  if (rules.opacity !== undefined && !rules.glass) style.opacity = rules.opacity;
  if (rules.glass) style.overflow = 'hidden';
  return style;
}