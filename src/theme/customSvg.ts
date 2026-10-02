import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export const SVG_MAX_BYTES = 256 * 1024;
export const MARKER_SVG_MAX_BYTES = 32 * 1024;
export const CUSTOM_ICON_NAMES = [
  'arrow.down', 'arrow.up', 'arrow.right', 'map', 'map.fill', 'list.bullet',
  'magnifyingglass', 'star', 'star.fill', 'settings', 'gearshape.fill',
  'my_location', 'filter_list', 'directions', 'copy', 'info.circle', 'flag',
  'github', 'kofi', 'lock', 'gift', 'oilcan.fill',
] as const;
export type CustomIconPack = { name: string; icons: Record<string, string> };
export type SvgErrorCode = 'invalid' | 'too_large' | 'unsupported' | 'viewbox' | 'symbols';
export class SvgImportError extends Error {
  constructor(public code: SvgErrorCode) { super(code); }
}
const TAGS = new Set(['svg', 'g', 'defs', 'symbol', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'title', 'desc']);
const ATTRS = new Set(['xmlns', 'id', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'transform', 'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'vector-effect', 'preserveAspectRatio']);
const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const serializer = new XMLSerializer();
function children(node: Node): Element[] {
  const result: Element[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i)!;
    if (child.nodeType === 1) result.push(child as Element);
    else if (child.nodeType !== 8 && child.nodeType !== 3) throw new SvgImportError('unsupported');
    else if (child.nodeType === 3 && child.nodeValue?.trim() && !['title', 'desc'].includes(node.nodeName)) throw new SvgImportError('unsupported');
  }
  return result;
}
function viewBox(element: Element, fallback?: string): string {
  const value = element.getAttribute('viewBox') || fallback || '';
  const numbers = value.trim().split(/[\s,]+/).map(Number);
  if (numbers.length !== 4 || !numbers.every(Number.isFinite) || numbers[2] <= 0 || numbers[3] <= 0) throw new SvgImportError('viewbox');
  return numbers.join(' ');
}
function parseSvg(xml: string, max: number): Element {
  if (typeof xml !== 'string' || !xml.trim()) throw new SvgImportError('invalid');
  if (xml.length > max) throw new SvgImportError('too_large');
  const source = xml.replace(/^\uFEFF/, '').replace(/^\s*<\?xml[^?]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
  if (/<!|<\?/.test(source)) throw new SvgImportError('unsupported');
  let failed = false;
  const fail = () => { failed = true; };
  let document: Document;
  try {
    document = new DOMParser({ errorHandler: { warning: fail, error: fail, fatalError: fail } }).parseFromString(source, 'image/svg+xml');
  } catch { throw new SvgImportError('invalid'); }
  const root = document.documentElement;
  if (failed || !root || root.tagName !== 'svg' || children(document).length !== 1) throw new SvgImportError('invalid');
  let nodes = 0;
  const validate = (element: Element, depth: number) => {
    if (++nodes > 2000 || depth > 24) throw new SvgImportError('too_large');
    if (!TAGS.has(element.tagName)) throw new SvgImportError('unsupported');
    if (element.namespaceURI && element.namespaceURI !== 'http://www.w3.org/2000/svg') throw new SvgImportError('unsupported');
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes.item(i)!;
      if (!ATTRS.has(attr.name) || /url\s*\(|[<>]/i.test(attr.value)) throw new SvgImportError('unsupported');
      if (attr.name === 'xmlns' && attr.value !== 'http://www.w3.org/2000/svg') throw new SvgImportError('unsupported');
    }
    for (const child of children(element)) validate(child, depth + 1);
  };
  validate(root, 0);
  viewBox(root);
  return root;
}
function normalizedSvg(element: Element, root: Element): string {
  const doc = root.ownerDocument!;
  const svg = doc.createElement('svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', viewBox(element, root.getAttribute('viewBox') || undefined));
  for (const owner of element === root ? [root] : [root, element]) {
    for (let i = 0; i < owner.attributes.length; i++) {
      const attr = owner.attributes.item(i)!;
      if (!['xmlns', 'id', 'viewBox', 'width', 'height', 'x', 'y'].includes(attr.name)) svg.setAttribute(attr.name, attr.value);
    }
  }
  let shapeCount = 0;
  const append = (element: Element, parent: Element) => {
    if (['title', 'desc'].includes(element.tagName)) return;
    if (['svg', 'defs', 'symbol'].includes(element.tagName)) throw new SvgImportError('unsupported');
    if (SHAPES.has(element.tagName)) shapeCount++;
    const copy = element.cloneNode(false) as Element;
    copy.removeAttribute('id');
    for (const child of children(element)) append(child, copy);
    parent.appendChild(copy);
  };
  for (const child of children(element)) append(child, svg);
  if (!shapeCount) throw new SvgImportError('invalid');
  return serializer.serializeToString(svg);
}
/** A pack is one SVG with named symbols; omitted symbols use Lucide. */
export function parseIconPack(xml: string, name = 'icons.svg'): CustomIconPack {
  const root = parseSvg(xml, SVG_MAX_BYTES);
  const icons: Record<string, string> = {};
  const collect = (element: Element) => {
    for (const child of children(element)) {
      if (child.tagName === 'defs') collect(child);
      else if (child.tagName === 'symbol') {
        const id = child.getAttribute('id') || '';
        if (!(CUSTOM_ICON_NAMES as readonly string[]).includes(id) || icons[id]) throw new SvgImportError('symbols');
        const xml = normalizedSvg(child, root);
        if (xml.length > MARKER_SVG_MAX_BYTES) throw new SvgImportError('too_large');
        icons[id] = xml;
      } else if (!['title', 'desc'].includes(child.tagName)) throw new SvgImportError('symbols');
    }
  };
  collect(root);
  if (!Object.keys(icons).length) throw new SvgImportError('symbols');
  return { name: name.replace(/[\r\n]/g, '').slice(0, 80), icons };
}
export function parseMarkerSvg(xml: string): string {
  const root = parseSvg(xml, MARKER_SVG_MAX_BYTES);
  return normalizedSvg(root, root);
}
export function restoreIconPack(value: string): CustomIconPack | null {
  try {
    if (value.length > SVG_MAX_BYTES * 2) return null;
    const pack = JSON.parse(value) as CustomIconPack;
    if (typeof pack.name !== 'string' || !pack.icons || typeof pack.icons !== 'object') return null;
    const entries = Object.entries(pack.icons);
    if (!entries.length || entries.some(([id, xml]) => !(CUSTOM_ICON_NAMES as readonly string[]).includes(id) || typeof xml !== 'string')) return null;
    return { name: pack.name.slice(0, 80), icons: Object.fromEntries(entries.map(([id, xml]) => [id, parseMarkerSvg(xml)])) };
  } catch { return null; }
}
