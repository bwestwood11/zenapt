const REPORT_CACHE_TTL_MS = 5 * 60_000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const reportCache = new Map<string, CacheEntry<unknown>>();

function pruneExpiredCacheEntries() {
  const now = Date.now();

  for (const [key, entry] of reportCache.entries()) {
    if (entry.expiresAt <= now) {
      reportCache.delete(key);
    }
  }
}

export async function getCachedReportResult<T>(
  key: string,
  producer: () => Promise<T>,
  ttlMs = REPORT_CACHE_TTL_MS,
): Promise<T> {
  pruneExpiredCacheEntries();

  const cachedEntry = reportCache.get(key) as CacheEntry<T> | undefined;
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.value;
  }

  const value = await producer();
  reportCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });

  return value;
}

export function clearCachedReportResult(prefix?: string) {
  if (!prefix) {
    reportCache.clear();
    return;
  }

  for (const key of reportCache.keys()) {
    if (key.startsWith(prefix)) {
      reportCache.delete(key);
    }
  }
}
