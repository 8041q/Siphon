import Ionicons, { type IoniconsIconName } from "@react-native-vector-icons/ionicons/static";

export type IconSetId = 'ionicons' | 'material' | 'fontawesome' | 'custom-svg';

type IoniconsName = IoniconsIconName;
type MaterialName = string;
type FontAwesomeName = string;

export type IconRenderer = (props: { name: string; size?: number; color?: string }) => React.ReactNode;

export interface IconSetDef {
  id: IconSetId;
  labelKey: string;
  render: IconRenderer;
}