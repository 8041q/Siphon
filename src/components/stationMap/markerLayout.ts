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

function screenDepth(station: PositionedStation, bearing: number): number {
  const [longitude, latitude] = station.geometry.coordinates;
  const radians = Math.PI / 180;
  const safeLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const mercatorX = (longitude + 180) / 360;
  const mercatorY = (1 - Math.log(Math.tan(Math.PI / 4 + safeLatitude * radians / 2)) / Math.PI) / 2;
  const angle = bearing * radians;
  // More-positive screen Y is closer to the bottom edge and covers earlier pins.
  return mercatorY * Math.cos(angle) - mercatorX * Math.sin(angle);
}

export function getMarkerStackOrders(stations: readonly PositionedStation[], bearing: number): Map<string, number> {
  const frontToBack = [...stations].sort((a, b) => screenDepth(b, bearing) - screenDepth(a, bearing));
  // React Native rounds zIndex to an integer on Android. Give each pin a
  // distinct integer so its PNG and price stack as a single unit.
  return new Map(frontToBack.map((station, index) => [station.properties.id, frontToBack.length - index]));
}
