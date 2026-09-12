import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

const GITHUB_REPO = '8041q/Siphon';
const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const ANDROID_PACKAGE = Application.applicationId ?? 'com.ctr_8041q.siphon';
const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const PLAY_STORE_APP_URL = `market://details?id=${ANDROID_PACKAGE}`;
const CHECK_TIMEOUT_MS = 10_000;

export type AppDistribution = 'play' | 'github' | 'preview' | 'development' | 'unknown';
export type AppUpdateKind = 'none' | 'ota' | 'binary';
export type AppUpdateError = 'no_releases' | 'check_failed' | 'apply_failed' | null;

type GitHubAsset = {
  name?: unknown;
  browser_download_url?: unknown;
};

type GitHubRelease = {
  tag_name?: unknown;
  html_url?: unknown;
  assets?: unknown;
};

type UpdateSnapshot = {
  checking: boolean;
  applying: boolean;
  updateAvailable: boolean;
  updateKind: AppUpdateKind;
  latestVersion: string | null;
  installedVersion: string;
  distribution: AppDistribution;
  error: AppUpdateError;
  releaseUrl: string | null;
  apkUrl: string | null;
};

function distributionForBuild(): AppDistribution {
  if (__DEV__) return 'development';
  const channel = Updates.channel;
  if (channel === 'production-github') return 'github';
  if (channel === 'production' && Platform.OS === 'android') return 'play';
  if (channel === 'preview') return 'preview';
  if (channel === 'development') return 'development';
  return 'unknown';
}

function normalizeVersion(value: string | null | undefined): string {
  if (!value) return '0.0.0';
  return value.trim().replace(/^v/i, '').split('-')[0] || '0.0.0';
}

function parseVersion(value: string): [number, number, number] | null {
  const match = normalizeVersion(value).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isNewerVersion(candidate: string, installed: string): boolean {
  const next = parseVersion(candidate);
  const current = parseVersion(installed);
  if (!next || !current) return false;
  for (let index = 0; index < 3; index += 1) {
    if (next[index] !== current[index]) return next[index] > current[index];
  }
  return false;
}

function installedVersionForBuild(): string {
  // runtimeVersion uses the appVersion policy in app.json, so it is the native
  // app version for release builds and stays stable across EAS OTA updates.
  return normalizeVersion(Application.nativeApplicationVersion ?? Updates.runtimeVersion);
}

const initialSnapshot: UpdateSnapshot = {
  checking: false,
  applying: false,
  updateAvailable: false,
  updateKind: 'none',
  latestVersion: null,
  installedVersion: installedVersionForBuild(),
  distribution: distributionForBuild(),
  error: null,
  releaseUrl: null,
  apkUrl: null,
};

let snapshot = initialSnapshot;
let checkPromise: Promise<void> | null = null;
let hasCheckedThisLaunch = false;
const listeners = new Set<(next: UpdateSnapshot) => void>();

function publish(next: Partial<UpdateSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener(snapshot);
}

async function fetchLatestGitHubRelease(): Promise<{
  version: string;
  releaseUrl: string;
  apkUrl: string | null;
} | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(GITHUB_API_LATEST_RELEASE, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub release check failed: ${response.status}`);

    const release = (await response.json()) as GitHubRelease;
    if (typeof release.tag_name !== 'string') throw new Error('GitHub release is missing tag_name');
    const releaseUrl = typeof release.html_url === 'string' ? release.html_url : GITHUB_RELEASES_URL;
    const assets = Array.isArray(release.assets) ? (release.assets as GitHubAsset[]) : [];
    const apk = assets.find(
      (asset) => typeof asset.name === 'string' && asset.name.toLowerCase().endsWith('.apk'),
    );

    return {
      version: normalizeVersion(release.tag_name),
      releaseUrl,
      apkUrl: typeof apk?.browser_download_url === 'string' ? apk.browser_download_url : null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runCheck(force = false): Promise<void> {
  if (!force && hasCheckedThisLaunch) return;
  if (checkPromise) return checkPromise;

  checkPromise = (async () => {
    hasCheckedThisLaunch = true;
    publish({ checking: true, error: null });

    let otaAvailable = false;
    let otaCheckFailed = false;
    if (!__DEV__ && Updates.isEnabled) {
      try {
        const result = await Updates.checkForUpdateAsync();
        otaAvailable = result.isAvailable || result.isRollBackToEmbedded;
      } catch {
        otaCheckFailed = true;
      }
    }

    const distribution = distributionForBuild();
    const installedVersion = installedVersionForBuild();
    let release: Awaited<ReturnType<typeof fetchLatestGitHubRelease>> = null;
    let releaseCheckFailed = false;

    // GitHub Releases is the canonical binary-version feed for public Android
    // builds. Preview/development builds only participate in EAS Update.
    if (distribution === 'play' || distribution === 'github') {
      try {
        release = await fetchLatestGitHubRelease();
      } catch {
        releaseCheckFailed = true;
      }
    }

    if (release && isNewerVersion(release.version, installedVersion)) {
      publish({
        checking: false,
        applying: false,
        updateAvailable: true,
        updateKind: 'binary',
        latestVersion: release.version,
        installedVersion,
        distribution,
        error: null,
        releaseUrl: release.releaseUrl,
        apkUrl: release.apkUrl,
      });
      return;
    }

    if (otaAvailable) {
      publish({
        checking: false,
        applying: false,
        updateAvailable: true,
        updateKind: 'ota',
        latestVersion: installedVersion,
        installedVersion,
        distribution,
        error: null,
        releaseUrl: release?.releaseUrl ?? null,
        apkUrl: release?.apkUrl ?? null,
      });
      return;
    }

    const noReleases = (distribution === 'play' || distribution === 'github') && !release && !releaseCheckFailed;
    publish({
      checking: false,
      applying: false,
      updateAvailable: false,
      updateKind: 'none',
      latestVersion: release?.version ?? null,
      installedVersion,
      distribution,
      error: noReleases ? 'no_releases' : releaseCheckFailed || otaCheckFailed ? 'check_failed' : null,
      releaseUrl: release?.releaseUrl ?? null,
      apkUrl: release?.apkUrl ?? null,
    });
  })().finally(() => {
    checkPromise = null;
  });

  return checkPromise;
}

async function openPlayStore(): Promise<void> {
  try {
    await Linking.openURL(PLAY_STORE_APP_URL);
  } catch {
    await Linking.openURL(PLAY_STORE_WEB_URL);
  }
}

async function applyAvailableUpdate(): Promise<boolean> {
  if (snapshot.applying || !snapshot.updateAvailable) return false;
  publish({ applying: true, error: null });

  try {
    if (snapshot.updateKind === 'ota') {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    }

    if (snapshot.updateKind === 'binary') {
      if (snapshot.distribution === 'play') {
        await openPlayStore();
        publish({ applying: false });
        return true;
      }

      if (snapshot.distribution === 'github') {
        await Linking.openURL(snapshot.apkUrl ?? snapshot.releaseUrl ?? GITHUB_RELEASES_URL);
        publish({ applying: false });
        return true;
      }
    }
  } catch {
    publish({ applying: false, error: 'apply_failed' });
    return false;
  }

  publish({ applying: false, error: 'apply_failed' });
  return false;
}

export function getUpdateUrl(): string {
  if (snapshot.distribution === 'play') return PLAY_STORE_WEB_URL;
  return snapshot.apkUrl ?? snapshot.releaseUrl ?? GITHUB_RELEASES_URL;
}

export function useAppUpdate() {
  const [state, setState] = useState<UpdateSnapshot>(snapshot);

  useEffect(() => {
    listeners.add(setState);
    setState(snapshot);
    void runCheck(false);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    check: runCheck,
    applyUpdate: applyAvailableUpdate,
  };
}
