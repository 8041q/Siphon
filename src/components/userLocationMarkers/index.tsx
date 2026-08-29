import { localMarkers, type SvgMarkerComponent } from './markers';

export type { SvgMarkerComponent } from './markers';

export const svgMarkers: Record<string, SvgMarkerComponent> = localMarkers;

export const SVG_MARKER_NAMES = Object.keys(svgMarkers);
