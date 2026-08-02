import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import * as TrackingTransparency from 'expo-tracking-transparency';

export function useAdConsent() {
  const [consentStatus, setConsentStatus] = useState<AdsConsentStatus | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  const ensureConsent = async () => {
    if (!initialized) {
      if (Platform.OS === 'ios') {
        try {
          await TrackingTransparency.requestTrackingPermissionsAsync();
        } catch {}
      }
      try {
        const info = await AdsConsent.requestInfoUpdate();
        setConsentStatus(info.status);
        if (info.isConsentFormAvailable) {
          await AdsConsent.showForm();
        }
        setInitialized(true);
        return info.status;
      } catch (error) {
        setConsentStatus(AdsConsentStatus.NOT_REQUIRED);
        setInitialized(true);
        return AdsConsentStatus.NOT_REQUIRED;
      }
    }
    return consentStatus;
  };
  
  const reset = useCallback(() => {
    setConsentStatus(null);
    setInitialized(false);
  }, []);
  
  return {
    ensureConsent,
    consentStatus,
    reset,
    isReady: initialized,
  };
}
