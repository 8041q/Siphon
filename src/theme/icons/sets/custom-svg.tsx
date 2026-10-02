import type { ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import type { IconRenderer } from '../types';

const star = 'm12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.6l6.2-.9Z';

// Each symbol keeps the same 24-point canvas and stroke weight so small tab,
// filter, and station-action icons remain recognizable across the app.
const SYMBOLS: Record<string, ReactNode> = {
  'arrow.down': <Path d="M12 4v16m-6-6 6 6 6-6" />,
  'arrow.up': <Path d="M12 20V4m-6 6 6-6 6 6" />,
  'arrow.right': <Path d="M4 12h16m-6-6 6 6-6 6" />,
  map: <><Path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z" /><Path d="M9 3v16M15 5v16" /></>,
  list: <><Path d="M8 6h13M8 12h13M8 18h13" /><Circle cx="3" cy="6" r=".8" /><Circle cx="3" cy="12" r=".8" /><Circle cx="3" cy="18" r=".8" /></>,
  search: <><Circle cx="10.5" cy="10.5" r="6.5" /><Path d="m16 16 5 5" /></>,
  star: <Path d={star} />,
  'star.fill': <Path d={star} fill="currentColor" />,
  settings: <><Path d="m10 3-.6 2.5-2 1.2L5 6l-2 3.5 1.8 1.8v2.4L3 15.5 5 19l2.4-.7 2 1.2L10 22h4l.6-2.5 2-1.2L19 19l2-3.5-1.8-1.8v-2.4L21 9.5 19 6l-2.4.7-2-1.2L14 3Z" /><Circle cx="12" cy="12.5" r="3" /></>,
  location: <><Circle cx="12" cy="12" r="7" /><Circle cx="12" cy="12" r="2" /><Path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  filter: <><Path d="M3 6h5M12 6h9M3 12h9M16 12h5M3 18h2M9 18h12" /><Circle cx="10" cy="6" r="2" /><Circle cx="14" cy="12" r="2" /><Circle cx="7" cy="18" r="2" /></>,
  directions: <><Path d="m12 2 10 10-10 10L2 12Z" /><Path d="M8 16v-5h8m-3-3 3 3-3 3" /></>,
  copy: <><Rect x="8" y="8" width="12" height="13" rx="2" /><Path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  info: <><Circle cx="12" cy="12" r="9" /><Path d="M12 11v6" /><Circle cx="12" cy="7" r=".8" fill="currentColor" /></>,
  flag: <><Path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0" /></>,
  github: <><Path d="M8 8v8m8-8v2a4 4 0 0 1-4 4H8" /><Circle cx="8" cy="5" r="3" /><Circle cx="16" cy="5" r="3" /><Circle cx="8" cy="19" r="3" /></>,
  coffee: <><Path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Zm12 1h2a3 3 0 0 1 0 6h-2M7 3v2M12 3v2M3 22h16" /></>,
  lock: <><Rect x="5" y="10" width="14" height="11" rx="2" /><Path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  gift: <><Rect x="3" y="8" width="18" height="5" rx="1" /><Path d="M5 13v8h14v-8M12 8v13" /><Path d="M12 8H8a3 3 0 1 1 3-3Zm0 0h4a3 3 0 1 0-3-3Z" /></>,
  market: <><Path d="M3 3v18h18M7 16l4-5 4 2 6-7M17 6h4v4" /></>,
};

const ALIASES: Record<string, string> = {
  'map.fill': 'map', 'list.bullet': 'list', magnifyingglass: 'search',
  star_border: 'star', 'gearshape.fill': 'settings', my_location: 'location',
  filter_list: 'filter', 'info.circle': 'info', kofi: 'coffee', 'oilcan.fill': 'market',
};

export const render: IconRenderer = ({ name, size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" color={color} fill="none"
    stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <G>{SYMBOLS[ALIASES[name] ?? name] ?? SYMBOLS.info}</G>
  </Svg>
);
