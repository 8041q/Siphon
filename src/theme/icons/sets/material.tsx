import { MaterialIcons } from '@expo/vector-icons';

import type { IconRenderer } from '../types';

type MaterialName = keyof typeof MaterialIcons.glyphMap;

const MAPPING: Record<string, MaterialName> = {
  'map.fill': 'map',
  'map': 'map',
  'list.bullet': 'list',
  'list': 'list',
  'magnifyingglass': 'search',
  'search': 'search',
  'star.fill': 'star',
  'star': 'star-border',
  'star_border': 'star-border',
  'gearshape.fill': 'settings',
  'settings': 'settings',
  'my_location': 'my-location',
  'filter_list': 'filter-list',
  'directions': 'navigation',
  'navigate_circle': 'navigation',
  'compass': 'explore',
  'location_pin': 'location-on',
  'copy': 'content-copy',
  'info.circle': 'info',
  'flag': 'flag',
  'github': 'code',
  'kofi': 'local-cafe',
  'lock': 'lock',
  'gift': 'card-giftcard',
  'oilcan.fill': 'local-gas-station',
};

export const render: IconRenderer = ({ name, size, color }) => {
  const resolved = MAPPING[name] ?? 'help-outline';
  return <MaterialIcons name={resolved} size={size} color={color} />;
};