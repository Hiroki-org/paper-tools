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
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should prune stale entries when adding a new one", () => {
        const testCache = new Map();
        testCache.set("staleKey", { data: "staleData", timestamp: Date.now() - CACHE_TTL_MS - 1000 });
        testCache.set("freshKey", { data: "freshData", timestamp: Date.now() });

        setCacheWithPruning("newKey", { data: "newData", timestamp: Date.now() }, testCache);

        expect(testCache.has("staleKey")).toBe(false);
        expect(testCache.has("freshKey")).toBe(true);
        expect(testCache.has("newKey")).toBe(true);
    });

    it("should remove oldest entry if max cache size is reached", () => {
        const testCache = new Map();

        for (let i = 0; i < MAX_CACHE_SIZE; i++) {
            testCache.set(`key${i}`, { data: `data${i}`, timestamp: Date.now() });
        }

        setCacheWithPruning("newKey", { data: "newData", timestamp: Date.now() }, testCache);

        expect(testCache.has("key0")).toBe(false);
        expect(testCache.has("newKey")).toBe(true);
        expect(testCache.size).toBe(MAX_CACHE_SIZE);
    });

    it("should not remove if key already exists and max cache is reached", () => {
        const testCache = new Map();

        for (let i = 0; i < MAX_CACHE_SIZE; i++) {
            testCache.set(`key${i}`, { data: `data${i}`, timestamp: Date.now() });
        }

        setCacheWithPruning("key0", { data: "updatedData", timestamp: Date.now() }, testCache);

        expect(testCache.has("key0")).toBe(true);
        expect(testCache.get("key0")?.data).toBe("updatedData");
        expect(testCache.size).toBe(MAX_CACHE_SIZE);
    });
});
