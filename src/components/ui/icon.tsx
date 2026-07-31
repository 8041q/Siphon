import { Ionicons } from '@expo/vector-icons';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const MAPPING: Record<string, IoniconsName> = {
  'map.fill': 'map',
  'map': 'map-outline',
  'list.bullet': 'list',
  'list': 'list-outline',
  'magnifyingglass': 'search',
  'search': 'search-outline',
  'star.fill': 'star',
  'star': 'star-outline',
  'star_border': 'star-outline',
  'gearshape.fill': 'settings',
  'settings': 'settings-outline',
  'my_location': 'locate',
  'filter_list': 'filter',
  'directions': 'navigate',
  'navigate_circle': 'navigate-circle-outline',
  'compass': 'compass-outline',
  'location_pin': 'location',
  'copy': 'copy-outline',
  'info.circle': 'information-circle-outline',
  'flag': 'flag-outline',
};

type IconProps = {
  name: string;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color }: IconProps) {
  const resolved = MAPPING[name] ?? 'help-circle-outline';
  return <Ionicons name={resolved} size={size} color={color} />;
}
