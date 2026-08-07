// Brand marker icons registered with the map's <Images> component.
//
// To add a brand:
//   1. Drop a 48x48 PNG at assets/brands/<key>.png (pointer tip at bottom
//      y=48, matching scripts/generate-teardrop.mjs geometry).
//   2. Add its require() below.
//   3. Add an entry to BRAND_MATCH: "normalizedBrand" -> "<key>". Normalized
//      brand strings are lowercase with non-alphanumerics stripped (see
//      enrichment); stations resolve to 'default' when unmatched.

import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { ImageSourceWithSdf, ImagesProps } from '@maplibre/maplibre-react-native';

// Image name -> asset used by the map <Images> component.
export const BRAND_ICONS: ImagesProps['images'] = {
  default: require('../../../assets/brands/default.png'),
  'status-dot': { source: require('../../../assets/brands/status-dot.png'), sdf: true },
};

/**
 * Maps a normalized brand string to an icon key in BRAND_ICONS. Unmatched
 * brands fall back to 'default' via the expression below, so entries are
 * optional/list-only-not-required.
 */
export const BRAND_MATCH: Record<string, string> = {
  // e.g. repsol: 'repsol',
};

/**
 * MapLibre "match" expression resolving `_icon` (a normalized brand key) to an
 * icon image name registered in BRAND_ICONS. Unknown values fall back to the
 * default teardrop.
 */
export function buildIconImageExpression(): ExpressionSpecification | string {
  const pairs: unknown[] = [];
  for (const [normalized, iconKey] of Object.entries(BRAND_MATCH)) {
    pairs.push(normalized, iconKey);
  }

  // If no brand match rules exist, avoid generating an invalid 'match' expression
  if (pairs.length === 0) {
    return 'default';
  }

  return ['match', ['get', '_icon'], ...pairs, 'default'] as unknown as ExpressionSpecification;
}