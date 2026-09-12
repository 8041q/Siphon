/**
 * Client-side guard for raw.githubusercontent.com requests.
 *
 * Request-budget mutations are serialized so concurrent tile fetches cannot all
 * observe the same remaining budget and then overwrite each other's log writes.
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
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(private store: KeyValueStore) {}

  private runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.mutationQueue.then(task, task);
    this.mutationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async readNumberRaw(key: string): Promise<number | null> {
    const raw = await this.store.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  private async readRequestLogRaw(): Promise<number[]> {
    const raw = await this.store.getItem(KEYS.requestLog);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw) as unknown;
      return Array.isArray(arr)
        ? arr.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        : [];
    } catch {
      return [];
    }
  }

  private async writeRequestLogRaw(log: number[]): Promise<void> {
    await this.store.setItem(KEYS.requestLog, JSON.stringify(log));
  }

  private async freshRequestLogRaw(now = Date.now()): Promise<number[]> {
    const log = await this.readRequestLogRaw();
    const cutoff = now - WINDOW_MS;
    const fresh = log.filter((timestamp) => timestamp > cutoff && timestamp <= now + WINDOW_MS);
    if (fresh.length !== log.length) await this.writeRequestLogRaw(fresh);
    return fresh;
  }

  private async blockedMsRaw(now = Date.now()): Promise<number> {
    const until = await this.readNumberRaw(KEYS.blockedUntil);
    if (!until) return 0;
    return Math.max(0, until - now);
  }

  /** Milliseconds until requests are allowed again (0 = not blocked). */
  async blockedMs(): Promise<number> {
    await this.mutationQueue;
    return this.blockedMsRaw();
  }

  /** Persist a server-side block, never shortening an existing longer block. */
  async recordBlocked(untilMs: number): Promise<void> {
    if (!Number.isFinite(untilMs)) return;
    await this.runExclusive(async () => {
      const current = await this.readNumberRaw(KEYS.blockedUntil);
      const next = Math.max(current ?? 0, untilMs);
      await this.store.setItem(KEYS.blockedUntil, String(next));
    });
  }

  /** Requests still allowed in the current hourly window. */
  async hourlyRemaining(): Promise<number> {
    return this.runExclusive(async () => {
      const log = await this.freshRequestLogRaw();
      return Math.max(0, HOURLY_BUDGET - log.length);
    });
  }

  /**
   * Atomically check the backoff/hourly limits and reserve one request slot.
   * Call this immediately before starting the actual network request.
   */
  async reserveRequest(): Promise<void> {
    await this.runExclusive(async () => {
      const now = Date.now();
      const blocked = await this.blockedMsRaw(now);
      if (blocked > 0) {
        const mins = Math.ceil(blocked / 60_000);
        throw new RateLimitedError(`GitHub rate limited. Retry in ~${mins} min.`);
      }

      const log = await this.freshRequestLogRaw(now);
      if (log.length >= HOURLY_BUDGET) {
        throw new RateLimitedError('GitHub hourly request budget exhausted. Retry later.');
      }

      log.push(now);
      await this.writeRequestLogRaw(log);
    });
  }

  /** Backwards-compatible explicit recording for any non-reserved callers. */
  async recordRequest(): Promise<void> {
    await this.runExclusive(async () => {
      const now = Date.now();
      const log = await this.freshRequestLogRaw(now);
      log.push(now);
      await this.writeRequestLogRaw(log);
    });
  }

  /** Whether a new request could be made right now. Does not reserve. */
  async canRequest(): Promise<boolean> {
    return this.runExclusive(async () => {
      if ((await this.blockedMsRaw()) > 0) return false;
      const log = await this.freshRequestLogRaw();
      return log.length < HOURLY_BUDGET;
    });
  }

  /** Compatibility check only. Prefer reserveRequest() for actual fetches. */
  async assertCanRequest(): Promise<void> {
    return this.runExclusive(async () => {
      const blocked = await this.blockedMsRaw();
      if (blocked > 0) {
        const mins = Math.ceil(blocked / 60_000);
        throw new RateLimitedError(`GitHub rate limited. Retry in ~${mins} min.`);
      }
      const log = await this.freshRequestLogRaw();
      if (log.length >= HOURLY_BUDGET) {
        throw new RateLimitedError('GitHub hourly request budget exhausted. Retry later.');
      }
    });
  }

  /**
   * Compatibility shim for older callers. Cooldown is no longer started here:
   * failed/interrupted syncs must remain immediately retryable.
   */
  async recordSyncStarted(): Promise<void> {
    return Promise.resolve();
  }

  async recordSyncCompleted(): Promise<void> {
    await this.runExclusive(async () => {
      await this.store.setItem(KEYS.lastSyncAt, String(Date.now()));
    });
  }

  async shouldRunSync(): Promise<'ok' | 'cooldown' | 'blocked'> {
    await this.mutationQueue;
    if ((await this.blockedMsRaw()) > 0) return 'blocked';
    const lastSyncAt = await this.readNumberRaw(KEYS.lastSyncAt);
    if (lastSyncAt && Date.now() - lastSyncAt < MIN_SYNC_INTERVAL_MS) return 'cooldown';
    return 'ok';
  }

  async getStatus(): Promise<RateLimitStatus> {
    await this.mutationQueue;
    const now = Date.now();
    const blockedUntil = await this.readNumberRaw(KEYS.blockedUntil);
    const lastSyncAt = await this.readNumberRaw(KEYS.lastSyncAt);
    const log = await this.runExclusive(() => this.freshRequestLogRaw(now));
    return {
      blocked: !!blockedUntil && blockedUntil > now,
      blockedUntil,
      hourlyRemaining: Math.max(0, HOURLY_BUDGET - log.length),
      hourlyBudget: HOURLY_BUDGET,
      lastSyncAt,
    };
  }
}
