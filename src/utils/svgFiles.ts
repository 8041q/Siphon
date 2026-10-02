import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { SvgImportError } from '../theme/customSvg';
export async function pickSvgFile(maxBytes: number): Promise<{ xml: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['image/svg+xml', 'text/xml', 'application/xml'], multiple: false, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || !asset.name.toLowerCase().endsWith('.svg')) throw new SvgImportError('invalid');
  const file = new File(asset.uri);
  if (Math.max(asset.size ?? 0, file.size) > maxBytes) throw new SvgImportError('too_large');
  const xml = await file.text();
  return { xml, name: asset.name };
}
export async function shareSvgTemplate(name: string, xml: string): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('sharing_unavailable');
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(xml);
  await Sharing.shareAsync(file.uri, { mimeType: 'image/svg+xml', UTI: 'public.svg-image' });
}
