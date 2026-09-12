import type { FuelStationFeature } from '../../api/siphonClient';

export type MapCameraRequest = {
  requestId: number;
  coordinates: [number, number];
  mode: 'station' | 'location';
};

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
  onMapReady?: () => void;
  cameraRequest?: MapCameraRequest | null;
  onCameraRequestConsumed?: (requestId: number) => void;
  userLocation?: { latitude: number; longitude: number; approximate: boolean };
}
