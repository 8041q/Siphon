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
  onRegionChange?: (lat: number, lng: number) => void;
}
