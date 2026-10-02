import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSupport } from '../hooks/useSupport';
import { useAppearanceLayout } from '../hooks/useAppearanceLayout';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useBottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import { SvgImportError, SVG_MAX_BYTES, parseIconPack } from '../theme/customSvg';
import { ICON_PACK_TEMPLATE } from '../theme/customSvgTemplates';
import { createCustomIconRenderer } from '../theme/icons/sets/custom-svg';
import { pickSvgFile, shareSvgTemplate } from '../utils/svgFiles';
import { SHEET_HANDLE_STYLE, SHEET_HANDLE_INDICATOR_STYLE } from '../theme/layout';
import { SheetBackground } from './ui/SheetBackground';
import { SheetBackdrop } from './ui/SheetBackdrop';
import { Button } from './ui/button';

export type CustomIconsSheetHandle = { present: () => void };
export const CustomIconsSheet = forwardRef<CustomIconsSheetHandle, object>(function CustomIconsSheet(_props, ref) {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { space } = useAppearanceLayout();
  const insets = useSafeAreaInsets();
  const { customIconPack, setCustomIconPack, setIconSetId } = useSupport();
  const modalRef = useRef<BottomSheetModal>(null);
  const { handleSheetChange, handleSheetDismiss } = useBottomSheetBackHandler(modalRef);
  const pendingApply = useRef(false);
  const visible = useRef(false);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapPoints = useMemo(() => ['62%'], []);
  useImperativeHandle(ref, () => ({ present: () => { visible.current = true; setError(null); modalRef.current?.present(); } }));
  const onDismiss = useCallback(() => {
    handleSheetDismiss();
    visible.current = false;
    if (pendingApply.current) { pendingApply.current = false; setIconSetId('custom-svg'); }
  }, [handleSheetDismiss, setIconSetId]);
  const apply = () => { pendingApply.current = true; modalRef.current?.dismiss(); };
  const importIcons = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const file = await pickSvgFile(SVG_MAX_BYTES);
      if (!file || !visible.current) return;
      const pack = parseIconPack(file.xml, file.name);
      await setCustomIconPack(pack);
      if (visible.current) apply();
    } catch (e) { setError(e instanceof SvgImportError ? `settings.svg_error_${e.code}` : 'settings.svg_error_import'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const template = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try { await shareSvgTemplate('siphon-icons.svg', ICON_PACK_TEMPLATE); }
    catch { setError('settings.svg_error_template'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const renderIcon = customIconPack ? createCustomIconRenderer(customIconPack.icons) : null;
  return <BottomSheetModal ref={modalRef} snapPoints={snapPoints} enablePanDownToClose enableDynamicSizing={false} enableContentPanningGesture={false}
    handleStyle={SHEET_HANDLE_STYLE} handleIndicatorStyle={[SHEET_HANDLE_INDICATOR_STYLE, { backgroundColor: colors.handleIndicator }]}
    onChange={handleSheetChange} onDismiss={onDismiss} backgroundComponent={SheetBackground} backdropComponent={SheetBackdrop}>
    <BottomSheetScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.lg + insets.bottom }}>
      <Text style={{ color: colors.label }} className="text-title2 font-semibold mb-sm">{t('settings.custom_icons_title')}</Text>
      <Text style={{ color: colors.secondaryLabel }} className="text-callout mb-md">{t('settings.custom_icons_description')}</Text>
      <Text style={{ color: colors.secondaryLabel }} className="text-footnote mb-lg">{t('settings.custom_icons_requirements')}</Text>
      {customIconPack && <View className="gap-sm mb-lg">
        <Text style={{ color: colors.label }} className="text-callout font-semibold">{customIconPack.name}</Text>
        <View className="flex-row gap-lg">{['map.fill', 'magnifyingglass', 'star.fill', 'oilcan.fill', 'gearshape.fill'].map(name => <View key={name}>{renderIcon?.({ name, size: 24, color: colors.tint })}</View>)}</View>
        <Text style={{ color: colors.secondaryLabel }} className="text-footnote">{t('settings.custom_icons_count', { count: Object.keys(customIconPack.icons).length })}</Text>
      </View>}
      <View className="gap-md">
        <Button onPress={importIcons} disabled={busy} loading={busy}>{t('settings.svg_import')}</Button>
        <Button variant="ghost" onPress={template} disabled={busy}>{t('settings.svg_template')}</Button>
        {customIconPack && <Button variant="ghost" onPress={apply} disabled={busy}>{t('settings.custom_icons_use')}</Button>}
      </View>
      {error && <Text accessibilityLiveRegion="polite" style={{ color: colors.priceHigh }} className="text-footnote mt-md">{t(error)}</Text>}
    </BottomSheetScrollView>
  </BottomSheetModal>;
});
