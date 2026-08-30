import Ionicons, { type IoniconsIconName } from "@react-native-vector-icons/ionicons/static";

import type { IconRenderer } from '../types';

type IoniconsName = IoniconsIconName;

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
  'gearshape.fill': 'cog',
  'settings': 'cog',
  'my_location': 'locate',
  'filter_list': 'color-filter-outline',
  'directions': 'navigate',
  'copy': 'copy-outline',
  'info.circle': 'information-circle-outline',
  'flag': 'flag-outline',
  'github': 'logo-github',
  'kofi': 'cafe',
  'lock': 'lock-closed',
  'gift': 'gift-outline',
  'oilcan.fill': 'bar-chart',
};

export const render: IconRenderer = ({ name, size, color }) => {
  const resolved = MAPPING[name] ?? 'help-circle-outline';
  return <Ionicons name={resolved} size={size} color={color} />;
};