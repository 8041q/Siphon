// ─── Tab bar layout ───────────────────────────────────────────────────────────
// Geometry for the floating bottom tab pill. Shared so screens can clear the
// overlay and keep their last content scrolled above it.

export const TAB_BAR_HEIGHT = 60;
/** Horizontal breathing room from each screen edge. */
export const TAB_BAR_H_MARGIN = 14;
/** Gap between the pill and the safe-area bottom / home indicator. */
export const TAB_BAR_FLOAT_GAP = 8;

/**
 * Bottom padding a scrollable screen needs so its last item can scroll above
 * the floating pill: pill height + float gap + the bottom safe-area inset.
 */
export function tabBarClearance(bottomInset: number): number {
  return TAB_BAR_HEIGHT + TAB_BAR_FLOAT_GAP + bottomInset;
}
