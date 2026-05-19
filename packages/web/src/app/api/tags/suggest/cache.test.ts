import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
    buildCacheKey,
    cache,
    CACHE_TTL_MS,
    isCacheEntryFresh,
    pruneExpiredEntries,
} from "./cache";

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

    it("reports entries as fresh only within the TTL", () => {
        const timestamp = Date.now();
        const entry = { data: ["tag1"], timestamp };

        expect(isCacheEntryFresh(entry, timestamp + CACHE_TTL_MS - 1)).toBe(true);
        expect(isCacheEntryFresh(entry, timestamp + CACHE_TTL_MS)).toBe(false);
    });

    it("prunes expired entries while keeping fresh entries", () => {
        const timestamp = Date.now();
        cache.set("fresh", { data: ["fresh"], timestamp });
        cache.set("expired", { data: ["expired"], timestamp: timestamp - CACHE_TTL_MS });

        pruneExpiredEntries(timestamp);

        expect(cache.has("fresh")).toBe(true);
        expect(cache.has("expired")).toBe(false);
    });

    it("separates cache keys by access token and data source", () => {
        expect(buildCacheKey("token-a", "db-1")).not.toBe(
            buildCacheKey("token-b", "db-1"),
        );
        expect(buildCacheKey("token-a", "db-1")).not.toBe(
            buildCacheKey("token-a", "db-2"),
        );
    });
});
