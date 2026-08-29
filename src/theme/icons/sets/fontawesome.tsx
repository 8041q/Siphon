import { FontAwesome } from '@expo/vector-icons';

import type { IconRenderer } from '../types';

type FaName = keyof typeof FontAwesome.glyphMap;

const MAPPING: Record<string, FaName> = {
  'map.fill': 'globe',
  'map': 'globe',
  'list.bullet': 'list',
  'list': 'list',
  'magnifyingglass': 'search',
  'search': 'search',
  'star.fill': 'star',
  'star': 'star-o',
  'star_border': 'star-o',
  'gearshape.fill': 'cog',
  'settings': 'cog',
  'my_location': 'crosshairs',
  'filter_list': 'filter',
  'directions': 'road',
  'navigate_circle': 'crosshairs',
  'compass': 'compass',
  'location_pin': 'map-marker',
  'copy': 'copy',
  'info.circle': 'info-circle',
  'flag': 'flag',
  'github': 'github',
  'kofi': 'coffee',
  'lock': 'lock',
  'gift': 'gift',
  'oilcan.fill': 'fire',
};

export const render: IconRenderer = ({ name, size, color }) => {
  const resolved = MAPPING[name] ?? 'question-circle';
  return <FontAwesome name={resolved} size={size} color={color} />;
};