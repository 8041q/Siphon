import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPO = '8041q/Siphon';
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const UPDATE_KEY = 'siphon:update:check';
const UPDATE_TTL_MS = 30 * 60 * 1000;

export interface UpdateStatus {
  updateAvailable: boolean;
  latestVersion: string | null;
  installedVersion: string;
  checking: boolean;
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

async function fetchLatestTag(): Promise<string | null> {
  const res = await fetch(RELEASES_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data.tag_name === 'string' ? data.tag_name.replace(/^v/i, '') : null;
}

export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateStatus>({
    updateAvailable: false,
    latestVersion: null,
    installedVersion: getInstalledVersion(),
    checking: false,
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
            });
            return;
          }
        } catch {}
      }
    }

    setStatus((s) => ({ ...s, checking: true }));
    const installed = getInstalledVersion();
    const latest = await fetchLatestTag();
    if (latest) {
      const updateAvailable = isNewer(latest, installed);
      await AsyncStorage.setItem(
        UPDATE_KEY,
        JSON.stringify({ at: Date.now(), updateAvailable, latestVersion: latest })
      );
      setStatus({ updateAvailable, latestVersion: latest, installedVersion: installed, checking: false });
    } else {
      setStatus((s) => ({ ...s, checking: false }));
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { ...status, check };
}
