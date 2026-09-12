type PerfToken = {
  name: string;
  startMark: string;
  endMark: string;
  startedAt: number;
} | null;

let perfSequence = 0;

function perfApi(): Performance | null {
  if (!__DEV__) return null;
  const api = globalThis.performance;
  if (!api || typeof api.mark !== 'function' || typeof api.measure !== 'function') return null;
  return api;
}

/**
 * Creates a React Native User Timing span. In RN 0.86 these measures appear in
 * the DevTools Performance timeline alongside JS, React, and network work.
 * Production builds return null and do no profiling work.
 */
export function beginPerf(name: string): PerfToken {
  const api = perfApi();
  if (!api) return null;

  const id = ++perfSequence;
  const startMark = `${name}:start:${id}`;
  const endMark = `${name}:end:${id}`;
  api.mark(startMark);
  return { name, startMark, endMark, startedAt: api.now() };
}

export function endPerf(token: PerfToken, minDurationMs = 0): number | null {
  if (!token) return null;
  const api = perfApi();
  if (!api) return null;

  const duration = api.now() - token.startedAt;
  try {
    api.mark(token.endMark);
    if (duration >= minDurationMs) {
      api.measure(token.name, token.startMark, token.endMark);
    }
  } finally {
    api.clearMarks(token.startMark);
    api.clearMarks(token.endMark);
  }
  return duration;
}

export function measureSync<T>(name: string, work: () => T, minDurationMs = 0): T {
  if (!__DEV__) return work();
  const token = beginPerf(name);
  try {
    return work();
  } finally {
    endPerf(token, minDurationMs);
  }
}

export async function measureAsync<T>(
  name: string,
  work: () => Promise<T>,
  minDurationMs = 0,
): Promise<T> {
  if (!__DEV__) return work();
  const token = beginPerf(name);
  try {
    return await work();
  } finally {
    endPerf(token, minDurationMs);
  }
}
