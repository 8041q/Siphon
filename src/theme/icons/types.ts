import type { Ionicons } from '@expo/vector-icons';

export type IconSetId = 'ionicons' | 'material' | 'fontawesome' | 'custom-svg';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type MaterialName = string;
type FontAwesomeName = string;

export type IconRenderer = (props: { name: string; size?: number; color?: string }) => React.ReactNode;

export interface IconSetDef {
  id: IconSetId;
  labelKey: string;
  render: IconRenderer;
}