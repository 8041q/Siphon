/**
 * rateLimit.ts
 *
 * Client-side guard that keeps the app from hammering GitHub (raw.githubusercontent.com).
 *
 * Three independent layers, all persisted in the file-backed store so clearing the
 * app cache (AsyncStorage) doesn't reset them:
 *
 *  1. Rolling hourly budget — caps the total number of GitHub requests per hour.
 *     A cold sync (first launch / after cache clear) is ~200 requests; normal
 *     "nothing changed" launches are 1 request (304).
 *  2. Minimum interval between sync cycles — prevents rapid relaunch loops from
 *     re-running a full sync every time.
 *  3. Server-side backoff — on 429/403 we persist a "blocked until" timestamp
 *     (from Retry-After / X-RateLimit-Reset) and refuse requests until it passes.
 */

import type { KeyValueStore } from './siphonClient';

export const HOURLY_BUDGET = 300;
export const MIN_SYNC_INTERVAL_MS = 10 * 60 * 1000;
export const DEFAULT_BACKOFF_MS = 5 * 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000;

const KEYS = {
  requestLog: 'siphon:rate:requestLog',
  lastSyncAt: 'siphon:rate:lastSyncAt',
  blockedUntil: 'siphon:rate:blockedUntil',
};

export class RateLimitedError extends Error {
  constructor(message = 'GitHub rate limit reached') {
    super(message);
    this.name = 'RateLimitedError';
  }
}

export interface RateLimitStatus {
  blocked: boolean;
  blockedUntil: number | null;
  hourlyRemaining: number;
  hourlyBudget: number;
  lastSyncAt: number | null;
}

export class RateLimiter {
  constructor(private store: KeyValueStore) {}

  private async readNumber(key: string): Promise<number | null> {
    const raw = await this.store.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  private async readRequestLog(): Promise<number[]> {
    const raw = await this.store.getItem(KEYS.requestLog);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((n): n is number => typeof n === 'number') : [];
    } catch {
      return [];
    }
  }

  private async writeRequestLog(log: number[]): Promise<void> {
    await this.store.setItem(KEYS.requestLog, JSON.stringify(log));
  }

  private async prune(log: number[]): Promise<number[]> {
    const cutoff = Date.now() - WINDOW_MS;
    const fresh = log.filter((ts) => ts > cutoff);
    if (fresh.length !== log.length) await this.writeRequestLog(fresh);
    return fresh;
  }

  /** Milliseconds until we are allowed to make another request (0 = not blocked). */
  async blockedMs(): Promise<number> {
    const until = await this.readNumber(KEYS.blockedUntil);
    if (!until) return 0;
    const remaining = until - Date.now();
    if (remaining <= 0) return 0;
    return remaining;
  }

  /** Persist a server-side block (429/403). */
  async recordBlocked(untilMs: number): Promise<void> {
    await this.store.setItem(KEYS.blockedUntil, String(untilMs));
  }

  /** Requests still allowed in the current hourly window. */
  async hourlyRemaining(): Promise<number> {
    const log = await this.prune(await this.readRequestLog());
    return Math.max(0, HOURLY_BUDGET - log.length);
  }

  /** Record that a request was made (call after performing it). */
  async recordRequest(): Promise<void> {
    const log = await this.prune(await this.readRequestLog());
    log.push(Date.now());
    await this.writeRequestLog(log);
  }

  /** Whether a new request is allowed right now. Does not record. */
  async canRequest(): Promise<boolean> {
    if ((await this.blockedMs()) > 0) return false;
    return (await this.hourlyRemaining()) > 0;
  }

  /** Hard-stop: refuse the request. */
  async assertCanRequest(): Promise<void> {
    const blocked = await this.blockedMs();
    if (blocked > 0) {
      const mins = Math.ceil(blocked / 60000);
      throw new RateLimitedError(`GitHub rate limited. Retry in ~${mins} min.`);
    }
    const remaining = await this.hourlyRemaining();
    if (remaining <= 0) {
      throw new RateLimitedError('GitHub hourly request budget exhausted. Retry later.');
    }
  }

  /** Persist the start of a sync cycle (used for the min-interval cooldown). */
  async recordSyncStarted(): Promise<void> {
    await this.store.setItem(KEYS.lastSyncAt, String(Date.now()));
  }

  /**
   * Whether a sync cycle should run at all. `cooldown` means "we just synced,
   * data is fresh" — the caller uses cache silently. `blocked` means the user
   * should see a notification.
   */
  async shouldRunSync(): Promise<'ok' | 'cooldown' | 'blocked'> {
    if ((await this.blockedMs()) > 0) return 'blocked';
    const lastSyncAt = await this.readNumber(KEYS.lastSyncAt);
    if (lastSyncAt && Date.now() - lastSyncAt < MIN_SYNC_INTERVAL_MS) return 'cooldown';
    return 'ok';
  }

  async getStatus(): Promise<RateLimitStatus> {
    const [blockedMs, remaining, lastSyncAt, blockedUntil] = await Promise.all([
      this.blockedMs(),
      this.hourlyRemaining(),
      this.readNumber(KEYS.lastSyncAt),
      this.readNumber(KEYS.blockedUntil),
    ]);
    return {
      blocked: blockedMs > 0,
      blockedUntil,
      hourlyRemaining: remaining,
      hourlyBudget: HOURLY_BUDGET,
      lastSyncAt,
    };
  }
}
