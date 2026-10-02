// Keep the composite PNG at its previous MapLibre display size.
export const MARKER_WIDTH = 160 * 0.50176;
export const MARKER_HEIGHT = 200 * 0.50176;
export const PRICE_TEXT_SIZE = 11;
// Former SymbolLayer: text-anchor=top, text-offset=[0, -5.1] (in ems).
export const PRICE_TOP = MARKER_HEIGHT - 5.1 * PRICE_TEXT_SIZE;

type PositionedStation = {
  geometry: { coordinates: number[] };
  properties: { id: string };
};

export type ProjectedStation = { id: string; x: number; y: number };

export function projectStations(stations: readonly PositionedStation[]): ProjectedStation[] {
  return stations.map(station => {
    const [longitude, latitude] = station.geometry.coordinates;
    const radians = Math.PI / 180;
    const safeLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
    const mercatorX = (longitude + 180) / 360;
    const mercatorY = (1 - Math.log(Math.tan(Math.PI / 4 + safeLatitude * radians / 2)) / Math.PI) / 2;
    return { id: station.properties.id, x: mercatorX, y: mercatorY };
  });
}

export function getProjectedMarkerStackOrders(stations: readonly ProjectedStation[], bearing: number): Map<string, number> {
  const angle = bearing * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Calculate depth once per station, rather than inside every sort comparison.
  const frontToBack = stations.map(station => ({ id: station.id, depth: station.y * cos - station.x * sin }))
    .sort((a, b) => b.depth - a.depth);
  // React Native rounds zIndex to an integer on Android. Give each pin a
  // distinct integer so its PNG and price stack as a single unit.
  return new Map(frontToBack.map((station, index) => [station.id, frontToBack.length - index]));
}

export function getMarkerStackOrders(stations: readonly PositionedStation[], bearing: number): Map<string, number> {
  return getProjectedMarkerStackOrders(projectStations(stations), bearing);
}

export const STATION_MARKER_MIN_ZOOM = 13;

export function detailedMarkersVisible(zoom: number, currentlyVisible: boolean): boolean {
  if (!Number.isFinite(zoom)) return currentlyVisible;
  return currentlyVisible ? zoom > STATION_MARKER_MIN_ZOOM - 0.1 : zoom >= STATION_MARKER_MIN_ZOOM + 0.1;
}
