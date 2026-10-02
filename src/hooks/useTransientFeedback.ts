import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Screen-local feedback: no provider churn, accessible timeouts, no stale timers. */
export function useTransientFeedback<T>(duration = 4000) {
  const [feedback, setFeedback] = useState<T | null>(null);
  const version = useRef(0);
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismiss = useCallback(() => {
    version.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setFeedback(null);
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      version.current += 1;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const show = useCallback((value: T) => {
    const run = ++version.current;
    if (timer.current) clearTimeout(timer.current);
    if (!mounted.current) return;
    setFeedback(value);
    const timeout = Platform.OS === 'android'
      ? AccessibilityInfo.getRecommendedTimeoutMillis(duration).catch(() => duration)
      : Promise.resolve(duration);
    void timeout.then(ms => {
      if (!mounted.current || version.current !== run) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        setFeedback(null);
      }, ms);
    });
  }, [duration]);
  return { feedback, show, dismiss };
}
