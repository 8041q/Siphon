import { SvgXml } from 'react-native-svg';
import { render as lucide } from './lucide';
import type { IconRenderer } from '../types';
const ALIASES: Record<string, string> = { list: 'list.bullet', search: 'magnifyingglass', star_border: 'star' };
export function createCustomIconRenderer(icons: Record<string, string>): IconRenderer {
  return props => {
    let name = ALIASES[props.name] ?? props.name;
    if (props.filled === false) name = ({ 'map.fill': 'map', 'gearshape.fill': 'settings', 'star.fill': 'star' } as Record<string, string>)[name] ?? name;
    if (props.filled === true) name = ({ map: 'map.fill', settings: 'gearshape.fill', star: 'star.fill' } as Record<string, string>)[name] ?? name;
    const xml = icons[name];
    return xml ? <SvgXml xml={xml} width={props.size ?? 24} height={props.size ?? 24} color={props.color ?? '#000'} /> : lucide(props);
  };
}
export const render: IconRenderer = lucide;
