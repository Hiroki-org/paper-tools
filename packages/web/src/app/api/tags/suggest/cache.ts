import { createHash } from "crypto";

export type CacheEntry<T> = {
	data: T;
	timestamp: number;
};

export const CACHE_TTL_MS = 60 * 1000; // 1 minute
export const MAX_CACHE_ENTRIES = 100;

// Global cache object so it persists across API requests in serverless functions (to some extent).
// Since nextjs development hot-reloads might clear this, we use globalThis to make it survive in dev.
const _global = globalThis as unknown as {
	__tagSuggestCache?: Map<string, CacheEntry<string[]>>;
	__tagSuggestInFlight?: Map<string, Promise<string[]>>;
};

export const cache =
	_global.__tagSuggestCache ?? new Map<string, CacheEntry<string[]>>();
if (!_global.__tagSuggestCache) {
	_global.__tagSuggestCache = cache;
}

export const inFlight =
	_global.__tagSuggestInFlight ?? new Map<string, Promise<string[]>>();
if (!_global.__tagSuggestInFlight) {
	_global.__tagSuggestInFlight = inFlight;
}

export function buildCacheKey(accessToken: string, dataSourceId: string) {
	const tokenHash = createHash("sha256").update(accessToken).digest("hex");
	return `${tokenHash}:${dataSourceId}`;
}

export function isCacheEntryFresh(
	entry: CacheEntry<unknown>,
	now = Date.now(),
) {
	return now - entry.timestamp < CACHE_TTL_MS;
}

export function pruneExpiredEntries(now = Date.now()) {
	for (const [key, entry] of cache.entries()) {
		if (!isCacheEntryFresh(entry, now)) {
			cache.delete(key);
		}
	}

	if (cache.size <= MAX_CACHE_ENTRIES) return;

	const entriesByAge = [...cache.entries()].sort(
		([, left], [, right]) => left.timestamp - right.timestamp,
	);
	for (const [key] of entriesByAge.slice(0, cache.size - MAX_CACHE_ENTRIES)) {
		cache.delete(key);
	}
}
