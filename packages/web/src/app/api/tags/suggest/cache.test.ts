import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { cache, CACHE_TTL_MS, MAX_CACHE_SIZE, setCacheWithPruning } from "./cache";

describe("cache", () => {
    beforeEach(() => {
        cache.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should store and retrieve data", () => {
        cache.set("key", { data: ["tag1", "tag2"], timestamp: Date.now() });
        const entry = cache.get("key");
        expect(entry?.data).toEqual(["tag1", "tag2"]);
    });

    it("should prune oldest entry when exceeding MAX_CACHE_SIZE", () => {
        const testCache = new Map();

        // Fill the cache up to its max size
        for (let i = 0; i < MAX_CACHE_SIZE; i++) {
            setCacheWithPruning(`key${i}`, { data: [`tag${i}`], timestamp: Date.now() }, testCache);
        }

        // Verify it reached max size
        expect(testCache.size).toBe(MAX_CACHE_SIZE);

        // Advance time to ensure next insertion doesn't share timestamp
        vi.advanceTimersByTime(10);

        // Add one more to exceed the max size
        setCacheWithPruning('overflow', { data: ['overflowTag'], timestamp: Date.now() }, testCache);

        // Size should remain MAX_CACHE_SIZE
        expect(testCache.size).toBe(MAX_CACHE_SIZE);

        // The oldest entry (key0) should be removed
        expect(testCache.has('key0')).toBe(false);

        // The newest entry should be present
        expect(testCache.has('overflow')).toBe(true);
    });
});
