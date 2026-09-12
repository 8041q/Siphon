import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
} from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

export type PrivacyOptionsResult = 'shown' | 'not_required' | 'failed';

export function useAdConsent() {
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(false);

  const applyInfo = useCallback((info: Awaited<ReturnType<typeof AdsConsent.getConsentInfo>>) => {
    if (!mountedRef.current) return;
    setPrivacyOptionsRequired(
      info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    );
  }, []);

  const readLatestInfo = useCallback(async () => {
    try {
      const info = await AdsConsent.requestInfoUpdate();
      applyInfo(info);
      return info;
    } catch {
      // UMP can still provide the last valid session status while offline.
      const info = await AdsConsent.getConsentInfo().catch(() => null);
      if (info) applyInfo(info);
      return info;
    }
  }, [applyInfo]);

  const refreshConsentInfo = useCallback(async () => {
    if (mountedRef.current) setRefreshing(true);
    try {
      return await readLatestInfo();
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [readLatestInfo]);

  useEffect(() => {
    mountedRef.current = true;
    // Refresh consent information once per app launch. This does not display a
    // form or request an ad; rewarded ads remain strictly user initiated.
    void refreshConsentInfo();
    return () => { mountedRef.current = false; };
  }, [refreshConsentInfo]);

  const ensureConsent = useCallback(async (): Promise<boolean> => {
    try {
      await AdsConsent.requestInfoUpdate();
      const info = await AdsConsent.loadAndShowConsentFormIfRequired();
      applyInfo(info);
      if (!info.canRequestAds) return false;

      // Manual ATT path. If AdMob's own IDFA message is enabled in Privacy &
      // messaging, remove this block to avoid presenting ATT twice.
      if (Platform.OS === 'ios') {
        const gdprApplies = await AdsConsent.getGdprApplies().catch(() => false);
        const purposeOne = gdprApplies
          ? (await AdsConsent.getPurposeConsents().catch(() => '')).startsWith('1')
          : true;
        if (purposeOne) {
          const current = await getTrackingPermissionsAsync();
          if (current.status === PermissionStatus.UNDETERMINED) {
            await requestTrackingPermissionsAsync();
          }
        }
      }
      return true;
    } catch {
      const info = await AdsConsent.getConsentInfo().catch(() => null);
      if (info) applyInfo(info);
      return info?.canRequestAds === true;
    }
  }, [applyInfo]);

  const showPrivacyOptions = useCallback(async (): Promise<PrivacyOptionsResult> => {
    if (mountedRef.current) setRefreshing(true);
    try {
      // Do not trust a launch-time status indefinitely. Privacy-message
      // configuration can change remotely, so refresh immediately before the
      // user asks to manage it.
      const info = await readLatestInfo();
      if (!info) return 'failed';
      if (
        info.privacyOptionsRequirementStatus ===
        AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED
      ) {
        return 'not_required';
      }
      if (
        info.privacyOptionsRequirementStatus !==
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
      ) {
        return 'failed';
      }

      const updated = await AdsConsent.showPrivacyOptionsForm();
      applyInfo(updated);
      return 'shown';
    } catch {
      return 'failed';
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [applyInfo, readLatestInfo]);

  return {
    ensureConsent,
    refreshConsentInfo,
    showPrivacyOptions,
    privacyOptionsRequired,
    refreshing,
  };
}
