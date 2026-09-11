import type { ViewStyle } from 'react-native';

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

// ─── Bottom-sheet handle ────────────────────────────────────────────────────
// @gorhom/bottom-sheet's default handle uses 10px padding. We previously added
// 4px vertical margin, which preserved spacing but left that margin outside the
// draggable hit area. Folding those 4px into padding keeps the pill in exactly
// the same visual position while making the full 33px-tall region draggable.
export const SHEET_HANDLE_STYLE: ViewStyle = {
  paddingVertical: 14,
};

export const SHEET_HANDLE_INDICATOR_STYLE: ViewStyle = {
  width: 40,
  height: 5,
  borderRadius: 3,
  alignSelf: 'center',
};
