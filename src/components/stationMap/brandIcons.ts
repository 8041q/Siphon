// Composite marker images: the original pin background plus an outlined brand
// logo. To add a brand, place its normalized PNG in assets/brands, run
// `npm run markers:generate`, then register the generated PNG below.
import type { ImageSourcePropType } from 'react-native';

export const STATION_MARKER_IMAGES: Record<string, ImageSourcePropType> = {
  'marker-default': require('../../../assets/brands/markers/default.png'),
  'marker-galp': require('../../../assets/brands/markers/galp.png'),
  'marker-bp': require('../../../assets/brands/markers/bp.png'),
  'marker-campsa': require('../../../assets/brands/markers/campsa.png'),
  'marker-cepsa': require('../../../assets/brands/markers/cepsa.png'),
  'marker-auchan': require('../../../assets/brands/markers/auchan.png'),
  'marker-autojulio': require('../../../assets/brands/markers/autojulio.png'),
  'marker-alvesbandeira': require('../../../assets/brands/markers/alvesbandeira.png'),
  'marker-dourogas': require('../../../assets/brands/markers/dourogas.png'),
  'marker-moeve': require('../../../assets/brands/markers/moeve.png'),
  'marker-nova': require('../../../assets/brands/markers/nova.png'),
  'marker-plenergy': require('../../../assets/brands/markers/plenergy.png'),
  'marker-prio': require('../../../assets/brands/markers/prio.png'),
  'marker-recheio': require('../../../assets/brands/markers/recheio.png'),
  'marker-repsol': require('../../../assets/brands/markers/repsol.png'),
  'marker-shell': require('../../../assets/brands/markers/shell.png'),
  'marker-tfuel': require('../../../assets/brands/markers/tfuel.png'),
  'marker-ozenergia': require('../../../assets/brands/markers/ozenergia.png'),
  'marker-petronor': require('../../../assets/brands/markers/petronor.png'),
  'marker-petroprix': require('../../../assets/brands/markers/petroprix.png'),
  'marker-intermarch': require('../../../assets/brands/markers/intermarch.png'),
};

/** Select a complete marker for each station, with a generic fallback. */
export function getStationMarkerImage(icon: string | undefined): ImageSourcePropType {
  return STATION_MARKER_IMAGES[`marker-${icon ?? 'default'}`] ?? STATION_MARKER_IMAGES['marker-default'];
}
