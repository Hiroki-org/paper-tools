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
export const MAX_CACHE_SIZE = 100;

export function setCacheWithPruning<T>(
	key: string,
	entry: CacheEntry<T>,
	targetCache: Map<string, CacheEntry<T>>,
) {
	// Check for stale entries first to free up space naturally
	const now = Date.now();
	for (const [k, v] of targetCache.entries()) {
		if (now - v.timestamp >= CACHE_TTL_MS) {
			targetCache.delete(k);
		}
	}

	// If still too large, delete oldest entry (first in insertion order due to Map behavior)
	if (targetCache.size >= MAX_CACHE_SIZE && !targetCache.has(key)) {
		const firstKey = targetCache.keys().next().value;
		if (firstKey !== undefined) {
			targetCache.delete(firstKey);
		}
	}

	targetCache.set(key, entry);
}
