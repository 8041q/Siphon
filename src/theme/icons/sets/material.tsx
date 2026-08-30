import MaterialIcons, { type MaterialIconsIconName } from "@react-native-vector-icons/material-icons/static";

import type { IconRenderer } from '../types';

type MaterialName = MaterialIconsIconName;

const MAPPING: Record<string, MaterialName> = {
  'map.fill': 'map',
  'map': 'map',
  'list.bullet': 'list',
  'list': 'list',
  'magnifyingglass': 'search',
  'search': 'search',
  'star.fill': 'star-half',
  'star': 'star',
  'star_border': 'star-border',
  'gearshape.fill': 'settings',
  'settings': 'settings',
  'my_location': 'my-location',
  'filter_list': 'filter-list',
  'directions': 'assistant-direction',
  'copy': 'copy-all',
  'info.circle': 'info',
  'flag': 'flag',
  'github': 'code',
  'kofi': 'local-cafe',
  'lock': 'lock',
  'gift': 'card-giftcard',
  'oilcan.fill': 'pie-chart',
};

export const render: IconRenderer = ({ name, size, color }) => {
  const resolved = MAPPING[name] ?? 'help-outline';
  return <MaterialIcons name={resolved} size={size} color={color} />;
};