import type { FuelStationFeature } from '../../api/siphonClient';

export interface StationMapProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  stations: FuelStationFeature[];
  onMarkerPress: (station: FuelStationFeature) => void;
  onRegionChange?: (lat: number, lng: number, bounds?: [number, number, number, number]) => void;
  flyToCoords?: [number, number] | null;
  userLocation?: { latitude: number; longitude: number; approximate: boolean };
}
