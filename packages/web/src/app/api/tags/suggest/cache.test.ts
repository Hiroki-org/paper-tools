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
});

describe("setCacheWithPruning", () => {
    let mockCache: Map<string, any>;

    beforeEach(() => {
        mockCache = new Map();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should prune entries older than CACHE_TTL_MS", () => {
        vi.setSystemTime(1000);

        mockCache.set("old", { data: ["old"], timestamp: 1000 });

        vi.setSystemTime(1000 + CACHE_TTL_MS);

        setCacheWithPruning("new", { data: ["new"], timestamp: Date.now() }, mockCache);

        expect(mockCache.has("old")).toBe(false);
        expect(mockCache.has("new")).toBe(true);
    });

    it("should respect MAX_CACHE_SIZE and evict oldest when full", () => {
        vi.setSystemTime(1000);

        for (let i = 0; i < MAX_CACHE_SIZE; i++) {
            mockCache.set(`key${i}`, { data: [`val${i}`], timestamp: 1000 + i });
        }

        expect(mockCache.size).toBe(MAX_CACHE_SIZE);

        setCacheWithPruning("newKey", { data: ["newVal"], timestamp: Date.now() }, mockCache);

        expect(mockCache.size).toBe(MAX_CACHE_SIZE);
        expect(mockCache.has("key0")).toBe(false);
        expect(mockCache.has("key1")).toBe(true);
        expect(mockCache.has("newKey")).toBe(true);
    });
});
