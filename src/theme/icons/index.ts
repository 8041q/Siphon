import type { IconSetId, IconSetDef } from './types';
import { render as ionicons } from './sets/ionicons';
import { render as material } from './sets/material';
import { render as fontawesome } from './sets/fontawesome';
import { render as customSvg } from './sets/custom-svg';

export type { IconSetId, IconSetDef, IconRenderer } from './types';



export const ICON_SETS: Record<IconSetId, IconSetDef> = {
  ionicons: { id: 'ionicons', labelKey: 'settings.iconset_ionicons', render: ionicons },
  material: { id: 'material', labelKey: 'settings.iconset_material', render: material },
  fontawesome: { id: 'fontawesome', labelKey: 'settings.iconset_fontawesome', render: fontawesome },
  'custom-svg': { id: 'custom-svg', labelKey: 'settings.iconset_customSvg', render: customSvg },
};

export const ICON_SET_ORDER: IconSetId[] = [
  'ionicons',
  'material',
  'fontawesome',
];

export function getIconSet(id: IconSetId): IconSetDef {
  return ICON_SETS[id] ?? ICON_SETS.ionicons;
}