import FontAwesome, { type FontAwesomeIconName } from "@react-native-vector-icons/fontawesome/static";

import type { IconRenderer } from '../types';

type FaName = FontAwesomeIconName;

const MAPPING: Record<string, FaName> = {
  'map.fill': 'map',
  'map': 'map-o',
  'list.bullet': 'list',
  'list': 'list',
  'magnifyingglass': 'search',
  'search': 'search',
  'star.fill': 'star',
  'star': 'star-o',
  'star_border': 'star-o',
  'gearshape.fill': 'gear',
  'settings': 'gear',
  'my_location': 'crosshairs',
  'filter_list': 'filter',
  'directions': 'car',
  'copy': 'clipboard',
  'info.circle': 'info-circle',
  'flag': 'flag',
  'github': 'github',
  'kofi': 'coffee',
  'lock': 'lock',
  'gift': 'gift',
  'arrow.down': 'arrow-down',
  'arrow.up': 'arrow-up',
  'arrow.right': 'arrow-right',
  'oilcan.fill': 'line-chart',
};

export const render: IconRenderer = ({ name, size, color }) => {
  const resolved = MAPPING[name] ?? 'question-circle';
  return <FontAwesome name={resolved} size={size} color={color} />;
};
