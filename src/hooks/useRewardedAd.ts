import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
  MobileAds,
} from 'react-native-google-mobile-ads';

// TODO(release): replace with your real AdMob rewarded ad unit IDs.
// Test IDs are used until then so the flow works end-to-end. The matching
// AdMob App IDs live in app.json under the react-native-google-mobile-ads plugin.
export const REWARDED_AD_UNIT_ID = TestIds.REWARDED;

const LOAD_TIMEOUT_MS = 15000;

type AdPhase = 'idle' | 'loading' | 'ready' | 'showing' | 'error';

export function useRewardedAd() {
  const [phase, setPhase] = useState<AdPhase>('idle');
  const phaseRef = useRef<AdPhase>('idle');
  const adRef = useRef<RewardedAd | null>(null);
  const resolveRef = useRef<((earned: boolean) => void) | null>(null);
  const earnedRef = useRef(false);

  const updatePhase = useCallback((next: AdPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    MobileAds().initialize().catch(() => {});
    return () => {
      adRef.current?.removeAllListeners();
      adRef.current = null;
    };
  }, []);

  const load = useCallback(() => {
    adRef.current?.removeAllListeners();
    const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);
    adRef.current = ad;
    earnedRef.current = false;
    updatePhase('loading');

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      if (adRef.current === ad) updatePhase('ready');
    });
    ad.addAdEventListener(AdEventType.ERROR, () => {
      if (adRef.current === ad) updatePhase('error');
    });
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earnedRef.current = true;
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      const resolve = resolveRef.current;
      resolveRef.current = null;
      if (resolve) resolve(earnedRef.current);
      earnedRef.current = false;
      if (adRef.current === ad) load();
    });

    ad.load();
  }, [updatePhase]);

  const showAd = useCallback(async (): Promise<boolean> => {
    const ad = adRef.current;
    if (!ad || phaseRef.current !== 'ready') return false;
    earnedRef.current = false;
    updatePhase('showing');
    try {
      ad.show();
    } catch {
      updatePhase('error');
      return false;
    }
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, [updatePhase]);

  const watchAd = useCallback(async (): Promise<boolean> => {
    const initial = phaseRef.current;
    if (initial === 'ready') return showAd();
    if (initial === 'loading' || initial === 'showing') return false;
    load();
    const startedAt = Date.now();
    for (;;) {
      const p = phaseRef.current;
      if (p === 'ready') return showAd();
      if (p === 'error' || Date.now() - startedAt > LOAD_TIMEOUT_MS) {
        return false;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }, [load, showAd]);

  return {
    watchAd,
    loaded: phase === 'ready',
    loading: phase === 'loading' || phase === 'idle',
  };
}
