import { useCallback, useEffect, useState, type RefObject } from 'react';
import { BackHandler, Platform } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

/**
 * Makes Android's system back action (hardware button or edge-back gesture)
 * dismiss the currently-open Gorhom bottom sheet before navigation handles it.
 *
 * BottomSheetModal is portal-based rather than React Native's native Modal, so
 * BackHandler continues to receive the Android back event while it is visible.
 */
export function useBottomSheetBackHandler(ref: RefObject<BottomSheetModal | null>) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSheetChange = useCallback((index: number) => {
    setIsOpen(index >= 0);
  }, []);

  const handleSheetDismiss = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isOpen) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      ref.current?.dismiss();
      return true;
    });

    return () => subscription.remove();
  }, [isOpen, ref]);

  return { handleSheetChange, handleSheetDismiss };
}
