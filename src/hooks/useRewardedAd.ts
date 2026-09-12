import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  AdEventType,
  MobileAds,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const PRODUCTION_REWARDED_AD_UNIT_ID = Platform.OS === 'ios'
  ? 'ca-app-pub-9869503535733811/3385404717'
  : 'ca-app-pub-9869503535733811/3093760673';

export const REWARDED_AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : PRODUCTION_REWARDED_AD_UNIT_ID;

const LOAD_TIMEOUT_MS = 15_000;

type AdPhase = 'idle' | 'loading' | 'ready' | 'showing' | 'error';

let mobileAdsInitPromise: Promise<unknown> | null = null;

function ensureMobileAdsInitialized(): Promise<unknown> {
  if (!mobileAdsInitPromise) {
    mobileAdsInitPromise = MobileAds().initialize().catch((error) => {
      mobileAdsInitPromise = null;
      throw error;
    });
  }
  return mobileAdsInitPromise;
}

export function useRewardedAd() {
  const [phase, setPhase] = useState<AdPhase>('idle');
  const phaseRef = useRef<AdPhase>('idle');
  const adRef = useRef<RewardedAd | null>(null);
  const mountedRef = useRef(false);
  const earnedRef = useRef(false);
  const showResolveRef = useRef<((earned: boolean) => void) | null>(null);
  const loadResolveRef = useRef<((ready: boolean) => void) | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const updatePhase = useCallback((next: AdPhase) => {
    phaseRef.current = next;
    if (mountedRef.current) setPhase(next);
  }, []);

  const settleLoad = useCallback((ready: boolean) => {
    clearLoadTimeout();
    const resolve = loadResolveRef.current;
    loadResolveRef.current = null;
    resolve?.(ready);
  }, [clearLoadTimeout]);

  const settleShow = useCallback((earned: boolean) => {
    const resolve = showResolveRef.current;
    showResolveRef.current = null;
    resolve?.(earned);
  }, []);

  const disposeAd = useCallback(() => {
    adRef.current?.removeAllListeners();
    adRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearLoadTimeout();
      disposeAd();
      settleLoad(false);
      settleShow(false);
      earnedRef.current = false;
      phaseRef.current = 'idle';
    };
  }, [clearLoadTimeout, disposeAd, settleLoad, settleShow]);

  const load = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;
    if (phaseRef.current === 'ready') return true;
    if (phaseRef.current === 'loading') {
      return new Promise<boolean>((resolve) => {
        const previous = loadResolveRef.current;
        loadResolveRef.current = (ready) => {
          previous?.(ready);
          resolve(ready);
        };
      });
    }
    if (phaseRef.current === 'showing') return false;

    try {
      await ensureMobileAdsInitialized();
    } catch {
      updatePhase('error');
      return false;
    }
    if (!mountedRef.current) return false;

    disposeAd();
    clearLoadTimeout();
    earnedRef.current = false;
    updatePhase('loading');

    const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);
    adRef.current = ad;

    const readyPromise = new Promise<boolean>((resolve) => {
      loadResolveRef.current = resolve;
    });

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      if (!mountedRef.current || adRef.current !== ad) return;
      updatePhase('ready');
      settleLoad(true);
    });

    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      if (adRef.current === ad) earnedRef.current = true;
    });

    ad.addAdEventListener(AdEventType.ERROR, () => {
      if (!mountedRef.current || adRef.current !== ad) return;
      const wasShowing = phaseRef.current === 'showing';
      updatePhase('error');
      settleLoad(false);
      if (wasShowing) settleShow(false);
      disposeAd();
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      if (adRef.current !== ad) return;
      const earned = earnedRef.current;
      earnedRef.current = false;
      settleShow(earned);
      disposeAd();
      updatePhase('idle');
      // Deliberately do not preload another ad. Loading remains user initiated.
    });

    loadTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current || adRef.current !== ad || phaseRef.current !== 'loading') return;
      updatePhase('error');
      settleLoad(false);
      disposeAd();
    }, LOAD_TIMEOUT_MS);

    try {
      ad.load();
    } catch {
      updatePhase('error');
      settleLoad(false);
      disposeAd();
    }

    return readyPromise;
  }, [clearLoadTimeout, disposeAd, settleLoad, settleShow, updatePhase]);

  const showAd = useCallback(async (): Promise<boolean> => {
    const ad = adRef.current;
    if (!ad || phaseRef.current !== 'ready' || !mountedRef.current) return false;

    earnedRef.current = false;
    updatePhase('showing');

    const result = new Promise<boolean>((resolve) => {
      showResolveRef.current = resolve;
    });

    try {
      await ad.show();
    } catch {
      settleShow(false);
      updatePhase('error');
      disposeAd();
      return false;
    }

    return result;
  }, [disposeAd, settleShow, updatePhase]);

  const watchAd = useCallback(async (): Promise<boolean> => {
    if (phaseRef.current === 'showing' || phaseRef.current === 'loading') return false;
    if (phaseRef.current !== 'ready') {
      const ready = await load();
      if (!ready || !mountedRef.current) return false;
    }
    return showAd();
  }, [load, showAd]);

  return {
    watchAd,
    loaded: phase === 'ready',
    loading: phase === 'loading',
  };
}
