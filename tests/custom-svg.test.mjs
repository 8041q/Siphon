import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { loadSource, deferred } from './helpers/loadSource.mjs';
import { hookHarness } from './helpers/hooks.mjs';

const svg = await loadSource('src/theme/customSvg.ts', { '@xmldom/xmldom': { DOMParser, XMLSerializer } });
const templates = await loadSource('src/theme/customSvgTemplates.ts');
const valid = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M2 2h20v20H2Z"/></svg>';

test('shipped SVG templates import all symbols and match the downloadable files', async () => {
  assert.equal(templates.ICON_PACK_TEMPLATE, await readFile(new URL('../assets/templates/siphon-icons.svg', import.meta.url), 'utf8'));
  assert.equal(templates.MARKER_TEMPLATE, await readFile(new URL('../assets/templates/siphon-marker.svg', import.meta.url), 'utf8'));
  const pack = svg.parseIconPack(templates.ICON_PACK_TEMPLATE, 'my-icons.svg');
  assert.deepEqual(Object.keys(pack.icons), Array.from(svg.CUSTOM_ICON_NAMES));
  assert.ok(pack.icons.star.includes('fill="none"'));
  assert.ok(pack.icons['star.fill'].includes('fill="currentColor"'));
  assert.equal(svg.restoreIconPack(JSON.stringify(pack)).name, 'my-icons.svg');
  const marker = svg.parseMarkerSvg(templates.MARKER_TEMPLATE);
  assert.ok(marker.includes('viewBox="0 0 48 48"'));
  assert.ok(marker.includes('currentColor'));
});

test('imports reject malformed, unsafe and unsupported SVGs before selection', () => {
  const cases = [
    ['<svg viewBox="0 0 24 24"><path></svg>', 'invalid'],
    ['<svg><path d="M0 0h1"/></svg>', 'viewbox'],
    ['<svg viewBox="0 0 0 24"><path d="M0 0h1"/></svg>', 'viewbox'],
    ['<!DOCTYPE svg [<!ENTITY x "a">]>' + valid, 'unsupported'],
    [valid.replace('<path ', '<path onload="alert(1)" '), 'unsupported'],
    [valid.replace('<path ', '<path style="fill:red" '), 'unsupported'],
    [valid.replace('fill="currentColor"', 'fill="url(https://example.com/a)"'), 'unsupported'],
    [valid.replace('<path ', '<image href="file:///secret" '), 'unsupported'],
    [valid.replace('<path ', '<script '), 'unsupported'],
    [valid.replace('<path ', '<foreignObject '), 'unsupported'],
    [valid.replace('<path ', '<use href="#shape" '), 'unsupported'],
    [valid.replace('<path ', '<text '), 'unsupported'],
    [valid + valid, 'invalid'],
    [' '.repeat(svg.MARKER_SVG_MAX_BYTES) + valid, 'too_large'],
  ];
  for (const [xml, code] of cases) assert.throws(() => svg.parseMarkerSvg(xml), error => error.code === code, xml.slice(0, 80));
  assert.equal(svg.restoreIconPack('{"name":"bad","icons":{"star":"<script/>"}}'), null);
  assert.equal(svg.restoreIconPack('not json'), null);
});

test('partial icon packs require known unique IDs and preserve per-symbol viewBox and theme color', () => {
  const wrap = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><defs>${body}</defs></svg>`;
  const symbol = '<symbol id="star" viewBox="0 0 48 48"><path d="M2 2h20v20H2Z"/></symbol>';
  const pack = svg.parseIconPack(wrap(symbol));
  assert.equal(Object.keys(pack.icons).join(','), 'star');
  assert.ok(pack.icons.star.includes('viewBox="0 0 48 48"'));
  assert.ok(pack.icons.star.includes('stroke="currentColor"'));
  for (const body of [symbol + symbol, symbol.replace('id="star"', 'id="unknown"'), '']) {
    assert.throws(() => svg.parseIconPack(wrap(body)), e => e.code === 'symbols');
  }
});

test('custom icons preserve outline/filled pairs, size and color while omissions fall back to Lucide', async () => {
  const { createCustomIconRenderer } = await loadSource('src/theme/icons/sets/custom-svg.tsx', {
    'react-native-svg': { SvgXml: 'SvgXml' }, './lucide': { render: props => ({ type:'Lucide', props }) },
  });
  const pack = svg.parseIconPack(templates.ICON_PACK_TEMPLATE);
  const render = createCustomIconRenderer(pack.icons);
  const outlined = render({ name:'star.fill', filled:false, size:19, color:'#123456' });
  assert.equal(outlined.props.xml, pack.icons.star);
  assert.equal(outlined.props.width, 19); assert.equal(outlined.props.height, 19); assert.equal(outlined.props.color, '#123456');
  assert.equal(render({ name:'star', filled:true }).props.xml, pack.icons['star.fill']);
  assert.equal(render({ name:'gearshape.fill', filled:false }).props.xml, pack.icons.settings);
  assert.equal(render({ name:'map.fill', filled:false }).props.xml, pack.icons.map);
  assert.equal(createCustomIconRenderer({ star:pack.icons.star })({ name:'star.fill', filled:true }).type, 'Lucide');
  assert.equal(createCustomIconRenderer({})({ name:'map.fill', filled:false }).props.filled, false);
});

test('imported pack persistence survives hydration and a new import wins a delayed read', async () => {
  const hooks = hookHarness(), read = deferred(), writes = [];
  const { useCustomIconPack } = await loadSource('src/hooks/useCustomIconPack.ts', {
    react:hooks.react, '../theme/customSvg':svg,
    '@react-native-async-storage/async-storage': { default:{ getItem:() => read.promise, setItem:async (...args) => writes.push(args) } },
  });
  const render = () => hooks.render(useCustomIconPack);
  const first = render(); hooks.flushEffects();
  const pack = svg.parseIconPack(templates.ICON_PACK_TEMPLATE, 'new.svg');
  await first.setCustomIconPack(pack);
  read.resolve(JSON.stringify({ ...pack, name:'old.svg' })); await new Promise(resolve => setImmediate(resolve));
  assert.equal(render().customIconPack.name, 'new.svg');
  assert.equal(JSON.parse(writes[0][1]).name, 'new.svg');
});

async function iconSheet({ pick, persist = async () => {}, pack = null } = {}) {
  const hooks = hookHarness(); hooks.react.forwardRef = component => component;
  hooks.react.useImperativeHandle = (ref, factory) => { ref.current = factory(); };
  const selection = [], writes = [], shared = []; let dismissals = 0;
  const { CustomIconsSheet } = await loadSource('src/components/CustomIconsSheet.tsx', {
    react:hooks.react, 'react-native': { Text:'Text', View:'View' },
    '@gorhom/bottom-sheet': { BottomSheetModal:'Modal', BottomSheetScrollView:'Scroll' },
    'react-native-safe-area-context': { useSafeAreaInsets:() => ({ bottom:34 }) },
    'react-i18next': { useTranslation:() => ({ t:key => key }) },
    '../hooks/useSupport': { useSupport:() => ({ customIconPack:pack, setCustomIconPack:async p => { await persist(p); writes.push(p); pack=p; }, setIconSetId:id => selection.push(id) }) },
    '../hooks/useAppearanceLayout': { useAppearanceLayout:() => ({ space:{ lg:12 } }) },
    '../hooks/useThemeTokens': { useThemeTokens:() => ({ colors:{} }) },
    '../hooks/useBottomSheetBackHandler': { useBottomSheetBackHandler:() => ({ handleSheetChange:() => {}, handleSheetDismiss:() => {} }) },
    '../theme/customSvg':svg, '../theme/customSvgTemplates':templates,
    '../theme/icons/sets/custom-svg': { createCustomIconRenderer:() => () => null },
    '../utils/svgFiles': { pickSvgFile:pick ?? (async () => null), shareSvgTemplate:async (...args) => shared.push(args) },
    '../theme/layout': {}, './ui/SheetBackground': {}, './ui/SheetBackdrop': {}, './ui/button': { Button:'Button' },
  });
  const ref={ current:null }; const render = () => hooks.render(() => CustomIconsSheet({},ref));
  let tree=render();tree.props.ref.current={present:() => {},dismiss:() => { dismissals++; }};
  ref.current.present();tree=render();
  return { selection,writes,shared,ref,render, get tree(){return tree}, get dismissals(){return dismissals},
    press:async label => { const node=hooks.walk(render()).find(n=>n.type==='Button'&&n.props.children===label);await node.props.onPress();tree=render(); },
    dismiss:() => { tree.props.onDismiss();tree=render(); },
    error:() => hooks.walk(render()).find(n=>n.props?.accessibilityLiveRegion==='polite')?.props.children,
  };
}

test('custom icon import persists before full sheet dismissal activates the set', async () => {
  const f=await iconSheet({pick:async()=>({xml:templates.ICON_PACK_TEMPLATE,name:'imported.svg'})});
  await f.press('settings.svg_import');
  assert.equal(f.writes[0].name,'imported.svg');assert.equal(f.dismissals,1);assert.deepEqual(f.selection,[]);
  f.dismiss();assert.deepEqual(f.selection,['custom-svg']);f.dismiss();assert.equal(f.selection.length,1);
  await f.press('settings.svg_template');assert.equal(f.shared[0][0],'siphon-icons.svg');
});

test('cancelled, invalid or failed icon imports keep the previous selection and allow retry', async () => {
  for (const options of [
    {pick:async()=>null},
    {pick:async()=>({xml:'<svg/>',name:'bad.svg'})},
    {pick:async()=>({xml:templates.ICON_PACK_TEMPLATE,name:'valid.svg'}),persist:async()=>{throw new Error('disk full');}},
  ]) {
    const f=await iconSheet(options);await f.press('settings.svg_import');
    assert.deepEqual(f.selection,[]);assert.equal(f.dismissals,0);assert.equal(f.writes.length,0);
    if (options.persist) assert.equal(f.error(),'settings.svg_error_import');
  }
  const pending=deferred(),f=await iconSheet({pick:()=>pending.promise});
  const importing=f.press('settings.svg_import');f.dismiss();pending.resolve({xml:templates.ICON_PACK_TEMPLATE,name:'late.svg'});await importing;
  assert.equal(f.writes.length,0);assert.deepEqual(f.selection,[]);
});

test('SVG file picker handles cancel, checks size before reading, and shares the template as SVG', async () => {
  let result = { canceled:true }, reads=0; const shared=[], written=[];
  class File { constructor(...args) { this.uri=args.join('/'); this.size=10; } async text(){reads++;return valid;} create(){} write(xml){written.push(xml);} }
  const { pickSvgFile, shareSvgTemplate } = await loadSource('src/utils/svgFiles.ts', {
    'expo-document-picker': { getDocumentAsync:async options => {assert.equal(options.copyToCacheDirectory,true);assert.equal(options.multiple,false);return result;} },
    'expo-sharing': { isAvailableAsync:async()=>true, shareAsync:async(...args)=>shared.push(args) },
    'expo-file-system': { File, Paths:{cache:'file:///cache'} }, '../theme/customSvg':svg,
  });
  assert.equal(await pickSvgFile(100),null);assert.equal(reads,0);
  result={canceled:false,assets:[{name:'large.svg',uri:'file:///x',size:101}]};
  await assert.rejects(pickSvgFile(100),e=>e.code==='too_large');assert.equal(reads,0);
  result={canceled:false,assets:[{name:'shape.SVG',uri:'file:///x',size:10}]};
  assert.equal((await pickSvgFile(100)).xml,valid);assert.equal(reads,1);
  await shareSvgTemplate('siphon-marker.svg',templates.MARKER_TEMPLATE);
  assert.equal(written[0],templates.MARKER_TEMPLATE);assert.equal(shared[0][1].mimeType,'image/svg+xml');
});

test('custom SVG location marker is validated, restored and saved independently of icon packs', async () => {
  const hooks=hookHarness(),writes=[];
  class Directory { constructor(){this.uri='file:///documents/siphon/markerImages';this.exists=false;} }
  class File { constructor(uri){this.uri=uri;this.exists=true;} }
  const saved={type:'custom-svg',value:templates.MARKER_TEMPLATE,name:'arrow.svg'};
  const {useUserLocationMarker}=await loadSource('src/hooks/useUserLocationMarker.ts',{
    react:hooks.react,'expo-file-system':{Directory,File,Paths:{document:'file:///documents'}},'../theme/customSvg':svg,
    '@react-native-async-storage/async-storage':{default:{getItem:async()=>JSON.stringify(saved),setItem:async(...args)=>writes.push(args),removeItem:async()=>{}}},
  });
  const render=()=>hooks.render(useUserLocationMarker);
  render();hooks.flushEffects();await new Promise(r=>setImmediate(r));
  assert.equal(render().marker.type,'custom-svg');assert.equal(render().marker.name,'arrow.svg');
  render().setMarker({type:'custom-svg',value:'<svg/>',name:'bad.svg'});assert.equal(writes.length,0);
  render().setMarker({type:'custom-svg',value:valid,name:'square.svg'});
  assert.equal(render().marker.name,'square.svg');assert.ok(JSON.parse(writes[0][1]).value.includes('currentColor'));
});

test('location marker import applies only after dismissal and invalid files leave the marker unchanged', async () => {
  const hooks=hookHarness(),changed=[];let pick=async()=>({xml:templates.MARKER_TEMPLATE,name:'marker.svg'}),dismissals=0;
  hooks.react.forwardRef=c=>c;hooks.react.useImperativeHandle=(ref,factory)=>{ref.current=factory();};
  const {MarkerSvgImportSheet}=await loadSource('src/components/MarkerSvgImportSheet.tsx',{
    react:hooks.react,'react-native':{View:'View',Text:'Text',Image:'Image',TouchableOpacity:'TouchableOpacity'},
    'react-native-svg':{SvgXml:'SvgXml'},'expo-haptics':{},'expo-image-picker':{},
    '@gorhom/bottom-sheet':{BottomSheetModal:'Modal',BottomSheetScrollView:'Scroll'},
    'react-i18next':{useTranslation:()=>({t:key=>key})},'react-native-safe-area-context':{useSafeAreaInsets:()=>({bottom:0})},
    '../hooks/useSupport':{useSupport:()=>({marker:{type:'svg',value:'location'},setMarker:m=>changed.push(m),isUnlocked:()=>true})},
    '../hooks/useAppearanceLayout':{useAppearanceLayout:()=>({space:{lg:12}})},'../hooks/useThemeTokens':{useThemeTokens:()=>({colors:{}})},
    '../hooks/useBottomSheetBackHandler':{useBottomSheetBackHandler:()=>({handleSheetChange:()=>{},handleSheetDismiss:()=>{}})},
    '../theme/customSvg':svg,'../theme/customSvgTemplates':templates,'../utils/svgFiles':{pickSvgFile:(...args)=>pick(...args),shareSvgTemplate:async()=>{}},
    '../theme/Icon':{},'../hooks/useUserLocationMarker':{},'../theme/layout':{},'./userLocationMarkers':{svgMarkers:{},SVG_MARKER_NAMES:[]},
    './ui/button':{Button:'Button'},'./ui/SheetBackground':{},'./ui/SheetBackdrop':{},
  });
  const ref={current:null};const render=()=>hooks.render(()=>MarkerSvgImportSheet({},ref));let tree=render();
  tree.props.ref.current={present:()=>{},dismiss:()=>{dismissals++;}};ref.current.present();
  const press=()=>hooks.walk(render()).find(n=>n.type==='Button'&&n.props.children==='settings.svg_import').props.onPress();
  await press();assert.equal(dismissals,1);assert.equal(changed.length,0);render().props.onDismiss();
  assert.equal(changed[0].type,'custom-svg');assert.equal(changed[0].name,'marker.svg');
  ref.current.present();pick=async()=>({xml:'<svg/>',name:'invalid.svg'});await press();
  assert.equal(dismissals,1);assert.equal(changed.length,1);
  assert.equal(hooks.walk(render()).find(n=>n.props?.accessibilityLiveRegion==='polite').props.children,'settings.svg_error_viewbox');
});


test('marker picker places the import + beside Brake and keeps selections open', async () => {
  const hooks=hookHarness(),changed=[];let imports=0,dismissals=0;
  hooks.react.forwardRef=c=>c;hooks.react.useImperativeHandle=(ref,f)=>{ref.current=f();};
  const names=['location','crown','oil','park','fire','fuel','brake'];
  const {LocationMarkerSheet}=await loadSource('src/components/LocationMarkerSheet.tsx',{
    react:hooks.react,'react-native':{View:'View',Text:'Text',Image:'Image',TouchableOpacity:'TouchableOpacity'},
    'expo-haptics':{selectionAsync:async()=>{}},'expo-image-picker':{},
    '@gorhom/bottom-sheet':{BottomSheetModal:'Modal',BottomSheetScrollView:'Scroll'},
    'react-i18next':{useTranslation:()=>({t:key=>key})},'react-native-safe-area-context':{useSafeAreaInsets:()=>({bottom:0})},
    '../hooks/useSupport':{useSupport:()=>({marker:{type:'svg',value:'location'},setMarker:m=>changed.push(m),isUnlocked:()=>true})},
    '../hooks/useAppearanceLayout':{useAppearanceLayout:()=>({space:{lg:12}})},'../hooks/useThemeTokens':{useThemeTokens:()=>({colors:{}})},
    '../hooks/useBottomSheetBackHandler':{useBottomSheetBackHandler:()=>({handleSheetChange:()=>{},handleSheetDismiss:()=>{}})},
    '../theme/Icon':{},'../hooks/useUserLocationMarker':{},'../theme/layout':{},'./userLocationMarkers':{svgMarkers:{},SVG_MARKER_NAMES:names},
    './MarkerSvgImportSheet':{MarkerSvgImportSheet:'Importer'},'./ui/button':{Button:'Button'},'./ui/SheetBackground':{},'./ui/SheetBackdrop':{},
  });
  const ref={current:null};const tree=hooks.render(()=>LocationMarkerSheet({},ref));
  const modal=hooks.walk(tree).find(n=>n.type==='Modal'),importer=hooks.walk(tree).find(n=>n.type==='Importer');
  modal.props.ref.current={present:()=>{},dismiss:()=>{dismissals++;}};
  importer.props.ref.current={present:()=>{imports++;}};
  const choices=hooks.walk(modal).filter(n=>n.props?.accessibilityRole==='button');
  assert.deepEqual(choices.map(n=>n.props.accessibilityLabel),[...names,'settings.marker_custom_svg']);
  assert.equal(hooks.walk(choices.at(-1)).find(n=>n.type==='Text').props.children,'+');
  assert.ok(!hooks.walk(modal).some(n=>n.props?.children==='settings.marker_svg_requirements'));
  assert.ok(tree.props.children.includes(importer),'import popup must be a sibling of the parent modal');
  choices.at(-1).props.onPress();assert.equal(imports,1);assert.equal(dismissals,0);
  choices[6].props.onPress();assert.equal(changed[0].value,'brake');assert.equal(dismissals,0);
  hooks.unmount();
});
