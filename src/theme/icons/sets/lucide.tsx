import ArrowDown from 'lucide-react-native/icons/arrow-down';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Map from 'lucide-react-native/icons/map';
import List from 'lucide-react-native/icons/list';
import Search from 'lucide-react-native/icons/search';
import Star from 'lucide-react-native/icons/star';
import Settings from 'lucide-react-native/icons/settings';
import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Navigation from 'lucide-react-native/icons/navigation';
import Copy from 'lucide-react-native/icons/copy';
import Info from 'lucide-react-native/icons/info';
import Flag from 'lucide-react-native/icons/flag';
import GitBranch from 'lucide-react-native/icons/git-branch';
import Coffee from 'lucide-react-native/icons/coffee';
import LockKeyhole from 'lucide-react-native/icons/lock-keyhole';
import Gift from 'lucide-react-native/icons/gift';
import ChartNoAxesColumnIncreasing from 'lucide-react-native/icons/chart-no-axes-column-increasing';
import type { IconRenderer } from '../types';
import Svg, { Path, Rect } from 'react-native-svg';

const SYMBOLS = {
  'arrow.down': ArrowDown, 'arrow.up': ArrowUp, 'arrow.right': ArrowRight,
  'map.fill': Map, map: Map, 'list.bullet': List, list: List,
  magnifyingglass: Search, search: Search, star: Star, star_border: Star,
  'star.fill': Star, 'gearshape.fill': Settings, settings: Settings,
  my_location: LocateFixed, filter_list: SlidersHorizontal, directions: Navigation,
  copy: Copy, 'info.circle': Info, flag: Flag, github: GitBranch, kofi: Coffee,
  lock: LockKeyhole, gift: Gift, 'oilcan.fill': ChartNoAxesColumnIncreasing,
};

export const render: IconRenderer = ({ name, size = 24, color = '#000', filled }) => {
  const solid = filled ?? name.endsWith('.fill');
  // Closed silhouettes keep the Lucide proportions; cutouts preserve detail.
  if (solid && ['map', 'map.fill', 'settings', 'gearshape.fill', 'oilcan.fill', 'magnifyingglass', 'search'].includes(name)) {
    return <Svg width={size} height={size} viewBox="0 0 24 24" color={color} fill={color}>
      {(name === 'map' || name === 'map.fill') && <Path d="M3 6 8.5 3v15L3 21Zm7-3 4 2v16l-4-2Zm5.5 2L21 3v15l-5.5 3Z" />}
      {(name === 'settings' || name === 'gearshape.fill') && <Path fillRule="evenodd" d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.321-1.915ZM15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" />}
      {name === 'oilcan.fill' && <><Rect x={3.5} y={14} width={3} height={7} rx={0.75} /><Rect x={10.5} y={8} width={3} height={13} rx={0.75} /><Rect x={17.5} y={2} width={3} height={19} rx={0.75} /></>}
      {(name === 'magnifyingglass' || name === 'search') && <Path fillRule="evenodd" d="M18 10.5a7.5 7.5 0 1 0-2.55 5.63l5.05 5.05 2-2-5.05-5.05A7.46 7.46 0 0 0 18 10.5ZM15 10.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />}
    </Svg>;
  }
  const Symbol = SYMBOLS[name as keyof typeof SYMBOLS] ?? Info;
  return <Symbol size={size} color={color} strokeWidth={1.75} fill={solid && (name === 'star.fill' || name === 'star') ? color : 'none'} />;
};
