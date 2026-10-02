/** Keep unfinished edits (empty, '.', '1.') while accepting only non-negative numbers. */
export function numericInput(text: string, integer = false): { text: string; value: number } | null {
  if (!(integer ? /^\d*$/ : /^\d*(?:\.\d*)?$/).test(text)) return null;
  const value = text === '' || text === '.' ? 0 : Number(text);
  return Number.isFinite(value) ? { text, value } : null;
}

/** Parent updates must not strip a trailing dot or leading/trailing zeros during editing. */
export function syncNumericInput(text: string, value: number): string {
  return numericInput(text)?.value === value ? text : String(value);
}
