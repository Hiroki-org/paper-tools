export type CacheEntry<T> = {
	data: T;
	timestamp: number;
};

// Global cache object so it persists across API requests in serverless functions (to some extent).
// Since nextjs development hot-reloads might clear this, we use globalThis to make it survive in dev.
const _global = globalThis as unknown as {
	__tagSuggestCache?: Map<string, CacheEntry<string[]>>;
};

export const cache =
	_global.__tagSuggestCache ?? new Map<string, CacheEntry<string[]>>();
if (!_global.__tagSuggestCache) {
	_global.__tagSuggestCache = cache;
}

export const CACHE_TTL_MS = 60 * 1000; // 1 minute
