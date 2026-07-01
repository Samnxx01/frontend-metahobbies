type CacheEntry<T> = {
  at: number;
  promise: Promise<T>;
};

const GOBERNANZA_API_CACHE_TTL_MS = 45_000;

const cacheByKey = new Map<string, CacheEntry<unknown>>();

export function gobernanzaApiCacheKey(parts: Record<string, string | boolean | null | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('&');
}

/** GET gobernanza con deduplicación concurrente y TTL corto (navegación / StrictMode). */
export async function fetchGobernanzaCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; force?: boolean }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? GOBERNANZA_API_CACHE_TTL_MS;
  const force = options?.force === true;
  const now = Date.now();

  if (!force) {
    const cached = cacheByKey.get(key) as CacheEntry<T> | undefined;
    if (cached && now - cached.at < ttlMs) {
      return cached.promise;
    }
  }

  const promise = fetcher().catch((err) => {
    if (cacheByKey.get(key)?.promise === promise) {
      cacheByKey.delete(key);
    }
    throw err;
  });

  cacheByKey.set(key, { at: now, promise });
  return promise;
}

export function invalidateGobernanzaApiCache(prefix?: string): void {
  if (!prefix) {
    cacheByKey.clear();
    return;
  }
  for (const key of cacheByKey.keys()) {
    if (key.startsWith(prefix)) cacheByKey.delete(key);
  }
}
