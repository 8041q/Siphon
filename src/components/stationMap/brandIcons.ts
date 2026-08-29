// Marker assets and brand logo registry for the station map.
//
// To add a brand:
//   1. Drop a transparent PNG logo at assets/brands/<key>.png. Aim for ~48x48
//      (the logo layer uses icon-size 0.5, so ~24px on screen inside the pin).
//   2. Add its require() to BRAND_LOGO_IMAGES.
//   3. Add an entry to BRAND_MATCH: "normalizedBrand" -> "<logo image key>".
//      Normalized brand strings are lowercase with non-alphanumerics stripped
//      (see markerEnrichment); unmatched brands fall back to the generic
//      teardrop, so there is always a valid image.

import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { ImagesProps } from '@maplibre/maplibre-react-native';

// Image name -> asset used by the map <Images> component.
export const BRAND_ICONS: ImagesProps['images'] = {
  // Shared teardrop silhouette (plain image with baked-in coloring).
  'marker-shape': require('../../../assets/brands/marker-shape.png'),
  // Generic teardrop used as the marker-body / logo fallback.
  default: require('../../../assets/brands/default.png'),

  // Add here all brands so they can get rendered
  galp: require('../../../assets/brands/galp.png'),
  bp: require('../../../assets/brands/bp.png'),
  campsa: require('../../../assets/brands/campsa.png'),
  cepsa: require('../../../assets/brands/cepsa.png'),
  auchan: require('../../../assets/brands/auchan.png'),
  autojulio: require('../../../assets/brands/autojulio.png'),
  alvesbandeira: require('../../../assets/brands/alvesbandeira.png'),
  dourogas: require('../../../assets/brands/dourogas.png'),
  moeve: require('../../../assets/brands/moeve.png'),
  nova: require('../../../assets/brands/nova.png'),
  plenergy: require('../../../assets/brands/plenergy.png'),
  prio: require('../../../assets/brands/prio.png'),
  recheio: require('../../../assets/brands/recheio.png'),
  repsol: require('../../../assets/brands/repsol.png'),
  shell: require('../../../assets/brands/shell.png'),
  tfuel: require('../../../assets/brands/tfuel.png'),
  ozenergia: require('../../../assets/brands/ozenergia.png'),
  petronor: require('../../../assets/brands/petronor.png'),
  petroprix: require('../../../assets/brands/petroprix.png'),
  intermarch: require('../../../assets/brands/intermarch.png'),
};


/**
 * Brand logo images, keyed by the same normalized brand string used by
 * enrichment (lowercase, alphanumerics only). The logo is overlaid in the
 * middle of the teardrop via its own symbol layer.
 */
export const BRAND_LOGO_IMAGES: ImagesProps['images'] = {
  // Provided later by the user, e.g.:
  // 'logo-reposol': require('../../../assets/brands/logo-reposol.png'),
}

/** Normalized brand string -> logo image key in BRAND_LOGO_IMAGES. */
export const BRAND_MATCH: Record<string, string> = {
  galp: 'galp',
  bp: 'bp',
  campsa: 'campsa',
  cepsa: 'cepsa',
  auchan: 'auchan',
  autojulio: 'autojulio',
  alvesbandeira: 'alvesbandeira',
  dourogas: 'dourogas',
  moeve: 'moeve',
  nova: 'nova',
  plenergy: 'plenergy',
  prio: 'prio',
  recheio: 'recheio',
  repsol: 'repsol',
  shell: 'shell',
  tfuel: 'tfuel',
  ozenergia: 'ozenergia',
  petronor: 'petronor',
  petroprix: 'petroprix',
  intermarch: 'intermarch',
}

/** Image key for the shared teardrop body. */
export const MARKER_SHAPE_ICON = 'marker-shape';

/**
 * MapLibre "match" expression resolving `_icon` (a normalized brand key) to a
 * brand logo image name in BRAND_LOGO_IMAGES. Unmatched values fall back to the
 * generic default teardrop, which is always registered, so the app never tries
 * to draw a missing image.
 */
export function buildLogoImageExpression(): ExpressionSpecification | string {
  const pairs: unknown[] = [];
  for (const [normalized, logoKey] of Object.entries(BRAND_MATCH)) {
    pairs.push(normalized, logoKey);
  }

  if (pairs.length === 0) {
    return 'default';
  }

  return ['match', ['get', '_icon'], ...pairs, 'default'] as unknown as ExpressionSpecification;
}