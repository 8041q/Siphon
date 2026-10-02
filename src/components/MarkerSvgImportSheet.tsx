import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SvgXml } from 'react-native-svg';
import { useSupport } from '../hooks/useSupport';
import { useAppearanceLayout } from '../hooks/useAppearanceLayout';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useBottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import { type UserLocationMarkerConfig } from '../hooks/useUserLocationMarker';
import { MARKER_SVG_MAX_BYTES, parseMarkerSvg, SvgImportError } from '../theme/customSvg';
import { MARKER_TEMPLATE } from '../theme/customSvgTemplates';
import { pickSvgFile, shareSvgTemplate } from '../utils/svgFiles';
import { SHEET_HANDLE_STYLE, SHEET_HANDLE_INDICATOR_STYLE } from '../theme/layout';
import { SheetBackground } from './ui/SheetBackground';
import { SheetBackdrop } from './ui/SheetBackdrop';
import { Button } from './ui/button';

export type MarkerSvgImportSheetHandle = { present: () => void };

export const MarkerSvgImportSheet = forwardRef<MarkerSvgImportSheetHandle, object>(function MarkerSvgImportSheet(_props, ref) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { space } = useAppearanceLayout();
  const insets = useSafeAreaInsets();
  const { marker, setMarker } = useSupport();
  const modalRef = useRef<BottomSheetModal>(null);
  const { handleSheetChange, handleSheetDismiss } = useBottomSheetBackHandler(modalRef);
  const snapPoints = useMemo(() => ['55%'], []);
  const visible = useRef(false);
  const busyRef = useRef(false);
  const pendingMarker = useRef<UserLocationMarkerConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({ present: () => { visible.current = true; setError(null); modalRef.current?.present(); } }));
  const onDismiss = useCallback(() => {
    handleSheetDismiss();
    visible.current = false;
    if (pendingMarker.current) {
      setMarker(pendingMarker.current);
      pendingMarker.current = null;
    }
  }, [handleSheetDismiss, setMarker]);

  const importSvg = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const file = await pickSvgFile(MARKER_SVG_MAX_BYTES);
      if (!file || !visible.current) return;
      pendingMarker.current = { type: 'custom-svg', value: parseMarkerSvg(file.xml), name: file.name };
      modalRef.current?.dismiss();
    } catch (e) { setError(e instanceof SvgImportError ? `settings.svg_error_${e.code}` : 'settings.svg_error_import'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const template = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try { await shareSvgTemplate('siphon-marker.svg', MARKER_TEMPLATE); }
    catch { setError('settings.svg_error_template'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  return <BottomSheetModal ref={modalRef} snapPoints={snapPoints} enablePanDownToClose enableDynamicSizing={false} enableContentPanningGesture={false}
    handleStyle={SHEET_HANDLE_STYLE} handleIndicatorStyle={[SHEET_HANDLE_INDICATOR_STYLE, { backgroundColor: colors.handleIndicator }]}
    onChange={handleSheetChange} onDismiss={onDismiss} backgroundComponent={SheetBackground} backdropComponent={SheetBackdrop}>
    <BottomSheetScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.lg + insets.bottom }}>
      <Text style={{ color: colors.label }} className="text-title2 font-semibold mb-sm">{t('settings.marker_custom_svg')}</Text>
      <Text style={{ color: colors.secondaryLabel }} className="text-footnote mb-lg">{t('settings.marker_svg_requirements')}</Text>
      {marker.type === 'custom-svg' && <View className="flex-row items-center gap-md mb-lg">
        <SvgXml xml={marker.value} width={48} height={48} color={colors.pin} />
        <Text style={{ color: colors.label }} className="text-callout flex-1">{marker.name ?? t('settings.marker_custom_svg')}</Text>
      </View>}
      <View className="gap-md">
        <Button onPress={importSvg} disabled={busy} loading={busy}>{t('settings.svg_import')}</Button>
        <Button variant="ghost" onPress={template} disabled={busy}>{t('settings.svg_template')}</Button>
        <Button variant="ghost" onPress={() => modalRef.current?.dismiss()}>{t('common.done')}</Button>
      </View>
      {error && <Text accessibilityLiveRegion="polite" style={{ color: colors.priceHigh }} className="text-footnote mt-md">{t(error)}</Text>}
    </BottomSheetScrollView>
  </BottomSheetModal>;
});
