import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import type { IconRenderer } from '../types';

function PlaceholderIcon({ size = 24, color = '#000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke={color} strokeWidth="1.5" />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}

const MAPPING: Record<string, string> = {
  'map.fill': 'map.fill',
  'map': 'map',
  'list.bullet': 'list.bullet',
  'list': 'list',
  'magnifyingglass': 'magnifyingglass',
  'search': 'search',
  'star.fill': 'star.fill',
  'star': 'star',
  'star_border': 'star_border',
  'gearshape.fill': 'gearshape.fill',
  'settings': 'settings',
  'my_location': 'my_location',
  'filter_list': 'filter_list',
  'directions': 'directions',
  'copy': 'copy',
  'info.circle': 'info.circle',
  'flag': 'flag',
  'github': 'github',
  'kofi': 'kofi',
  'lock': 'lock',
  'gift': 'gift',
  'oilcan.fill': 'oilcan.fill',
};

export const render: IconRenderer = ({ name, size, color }) => {
  return <PlaceholderIcon size={size} color={color} />;
};