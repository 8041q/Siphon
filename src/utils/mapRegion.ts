import type { FuelStationFeature } from '../api/siphonClient';

export type MapBounds = [number, number, number, number];
export type MapRegion = { lat: number; lng: number; bounds?: MapBounds };

/** A bounded initial area until the native camera reports its actual viewport. */
export function initialMapRegion(lat: number, lng: number): MapRegion {
  return { lat, lng, bounds: [lng - 0.1, lat - 0.1, lng + 0.1, lat + 0.1] };
}

export function paddedMapBounds(bounds: MapBounds): MapBounds {
  const [west, south, east, north] = bounds;
  const latitudeMargin = (north - south) * 0.15;
  const longitudeMargin = (east - west) * 0.15;
  return [west - longitudeMargin, south - latitudeMargin, east + longitudeMargin, north + latitudeMargin];
}

export function stationsInBounds(stations: readonly FuelStationFeature[], bounds: MapBounds): FuelStationFeature[] {
  const [west, south, east, north] = paddedMapBounds(bounds);
  return stations.filter(({ geometry: { coordinates: [lng, lat] } }) =>
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= south && lat <= north && lng >= west && lng <= east,
  );
}

export function sameStationFeatures(a: readonly FuelStationFeature[], b: readonly FuelStationFeature[]): boolean {
  return a.length === b.length && a.every((station, index) => station === b[index]);
}
