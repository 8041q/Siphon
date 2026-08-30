import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPO = '8041q/Siphon';
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const UPDATE_KEY = 'siphon:update:check';
const UPDATE_TTL_MS = 30 * 60 * 1000;

export type UpdateError = 'network' | 'rate_limit' | 'no_releases';

export interface UpdateStatus {
  updateAvailable: boolean;
  latestVersion: string | null;
  installedVersion: string;
  checking: boolean;
  error: UpdateError | null;
}

export function getInstalledVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

// Android downloads the APK directly from the release asset; iOS opens the
// release page until a proper iOS distribution path exists. Gate any platform
// decision here so removing iOS later is a one-line change.
export function getUpdateUrl(): string {
  return Platform.OS === 'android'
    ? `https://github.com/${REPO}/releases/latest/download/siphon.apk`
    : `https://github.com/${REPO}/releases/latest`;
}

function parseSemver(version: string): number[] {
  const match = version.replace(/^v/i, '').match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isNewer(latest: string, installed: string): boolean {
  const a = parseSemver(latest);
  const b = parseSemver(installed);
  if (a.length === 0 || b.length === 0) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

interface FetchResult {
  tag: string | null;
  error: UpdateError | null;
}

async function fetchLatestTag(): Promise<FetchResult> {
  try {
    const res = await fetch(RELEASES_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.status === 404) return { tag: null, error: 'no_releases' };
    if (res.status === 403) return { tag: null, error: 'rate_limit' };
    if (!res.ok) return { tag: null, error: 'network' };
    const data = await res.json();
    const tag = typeof data.tag_name === 'string' ? data.tag_name.replace(/^v/i, '') : null;
    return { tag, error: null };
  } catch {
    return { tag: null, error: 'network' };
  }
}

export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateStatus>({
    updateAvailable: false,
    latestVersion: null,
    installedVersion: getInstalledVersion(),
    checking: false,
    error: null,
  });

  const check = useCallback(async (force = false) => {
    if (!force) {
      const raw = await AsyncStorage.getItem(UPDATE_KEY);
      if (raw) {
        try {
          const cached = JSON.parse(raw);
          if (Date.now() - cached.at < UPDATE_TTL_MS) {
            setStatus({
              updateAvailable: !!cached.updateAvailable,
              latestVersion: cached.latestVersion ?? null,
              installedVersion: getInstalledVersion(),
              checking: false,
              error: null,
            });
            return;
          }
        } catch {}
      }
    }

    setStatus((s) => ({ ...s, checking: true, error: null }));
    const installed = getInstalledVersion();
    const { tag, error } = await fetchLatestTag();
    if (error) {
      setStatus({ updateAvailable: false, latestVersion: null, installedVersion: installed, checking: false, error });
    } else if (tag) {
      const updateAvailable = isNewer(tag, installed);
      await AsyncStorage.setItem(
        UPDATE_KEY,
        JSON.stringify({ at: Date.now(), updateAvailable, latestVersion: tag })
      );
      setStatus({ updateAvailable, latestVersion: tag, installedVersion: installed, checking: false, error: null });
    } else {
      setStatus((s) => ({ ...s, checking: false, error: null }));
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { ...status, check };
}
