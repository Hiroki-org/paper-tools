import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { cache, CACHE_TTL_MS, MAX_CACHE_SIZE, setCacheWithPruning } from "./cache";

describe("cache", () => {
    beforeEach(() => {
        cache.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date(1000000));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should store and retrieve data", () => {
        cache.set("key", { data: ["tag1", "tag2"], timestamp: Date.now() });
        const entry = cache.get("key");
        expect(entry?.data).toEqual(["tag1", "tag2"]);
    });

    describe("setCacheWithPruning", () => {
        it("should add an entry to an empty cache", () => {
            const map = new Map();
            setCacheWithPruning("key1", { data: "data1", timestamp: Date.now() }, map);
            expect(map.size).toBe(1);
            expect(map.get("key1")?.data).toBe("data1");
        });

        it("should remove stale entries before adding", () => {
            const map = new Map();
            const now = Date.now();
            map.set("stale", { data: "staleData", timestamp: now - CACHE_TTL_MS - 1 });
            map.set("fresh", { data: "freshData", timestamp: now - 1000 });

            setCacheWithPruning("newKey", { data: "newData", timestamp: now }, map);

            expect(map.size).toBe(2);
            expect(map.has("stale")).toBe(false);
            expect(map.has("fresh")).toBe(true);
            expect(map.has("newKey")).toBe(true);
        });

        it("should remove oldest entry if cache exceeds max size", () => {
            const map = new Map();
            const now = Date.now();

            for (let i = 0; i < MAX_CACHE_SIZE; i++) {
                map.set(`key${i}`, { data: `data${i}`, timestamp: now - 5000 + i });
            }

            expect(map.size).toBe(MAX_CACHE_SIZE);

            setCacheWithPruning("newKey", { data: "newData", timestamp: now }, map);

            expect(map.size).toBe(MAX_CACHE_SIZE);
            expect(map.has("key0")).toBe(false); // first inserted
            expect(map.has("key1")).toBe(true);
            expect(map.has("newKey")).toBe(true);
        });

        it("should not remove oldest entry if updating an existing key when at max size", () => {
            const map = new Map();
            const now = Date.now();
            const existingKey = `key${Math.floor(MAX_CACHE_SIZE / 2)}`;

            for (let i = 0; i < MAX_CACHE_SIZE; i++) {
                map.set(`key${i}`, { data: `data${i}`, timestamp: now - 5000 + i });
            }

            setCacheWithPruning(existingKey, { data: "updatedData", timestamp: now }, map);

            expect(map.size).toBe(MAX_CACHE_SIZE);
            expect(map.has("key0")).toBe(true);
            expect(map.get(existingKey)?.data).toBe("updatedData");
        });
    });
});
