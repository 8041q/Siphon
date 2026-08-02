import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import * as TrackingTransparency from 'expo-tracking-transparency';

async function adsAllowed(status: AdsConsentStatus | null): Promise<boolean> {
  if (status === AdsConsentStatus.NOT_REQUIRED) return true;
  if (status === AdsConsentStatus.OBTAINED) {
    try {
      const choices = await AdsConsent.getUserChoices();
      return choices.selectBasicAds;
    } catch {
      return false;
    }
  }
  return false;
}

export function useAdConsent() {
  const [consentStatus, setConsentStatus] = useState<AdsConsentStatus | null>(null);
  const [initialized, setInitialized] = useState(false);

  const gatherConsent = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      try {
        await TrackingTransparency.requestTrackingPermissionsAsync();
      } catch {}
    }
    let info;
    try {
      info = await AdsConsent.requestInfoUpdate();
    } catch {
      setConsentStatus(AdsConsentStatus.NOT_REQUIRED);
      setInitialized(true);
      return true;
    }
    let status = info.status;
    if (info.isConsentFormAvailable) {
      try {
        const result = await AdsConsent.showForm();
        status = result.status;
      } catch {
        status = AdsConsentStatus.UNKNOWN;
      }
    }
    setConsentStatus(status);
    setInitialized(true);
    return adsAllowed(status);
  }, []);

  // Gatekeeper: consent is requested on every "watch an ad" attempt. If the
  // user declines or dismisses the form, their stored choice is reset so the
  // form is presented again on the next attempt. Ads only play once consent
  // is given. Ads are purely optional, so this never locks anyone out.
  const ensureConsent = useCallback(async (): Promise<boolean> => {
    if (!initialized) return gatherConsent();
    if (await adsAllowed(consentStatus)) return true;
    try {
      AdsConsent.reset();
    } catch {}
    return gatherConsent();
  }, [initialized, consentStatus, gatherConsent]);

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
