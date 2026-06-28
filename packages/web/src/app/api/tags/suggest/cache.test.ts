import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CacheEntry } from "./cache";
import { CACHE_TTL_MS, MAX_CACHE_SIZE, setCacheWithPruning } from "./cache";

describe("setCacheWithPruning", () => {
	let mockCache: Map<string, CacheEntry<string>>;

	beforeEach(() => {
		mockCache = new Map();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should add a new entry to the cache", () => {
		const entry = { data: "test-data", timestamp: Date.now() };
		setCacheWithPruning("key1", entry, mockCache);

		expect(mockCache.size).toBe(1);
		expect(mockCache.get("key1")).toEqual(entry);
	});

	it("should prune stale entries based on TTL", () => {
		const now = Date.now();
		const staleEntry = { data: "stale", timestamp: now - CACHE_TTL_MS - 1000 };
		const freshEntry = { data: "fresh", timestamp: now - 1000 };

		mockCache.set("staleKey", staleEntry);
		mockCache.set("freshKey", freshEntry);

		const newEntry = { data: "new", timestamp: now };
		setCacheWithPruning("newKey", newEntry, mockCache);

		expect(mockCache.size).toBe(2);
		expect(mockCache.has("staleKey")).toBe(false);
		expect(mockCache.has("freshKey")).toBe(true);
		expect(mockCache.has("newKey")).toBe(true);
	});

	it("should evict the oldest entry when MAX_CACHE_SIZE is reached", () => {
		const now = Date.now();
		for (let i = 0; i < MAX_CACHE_SIZE; i++) {
			mockCache.set(`key${i}`, { data: `data${i}`, timestamp: now });
		}

		const newEntry = { data: "new", timestamp: now };
		setCacheWithPruning("newKey", newEntry, mockCache);

		expect(mockCache.size).toBe(MAX_CACHE_SIZE);
		expect(mockCache.has("key0")).toBe(false); // Oldest entry should be evicted
		expect(mockCache.has("key1")).toBe(true);
		expect(mockCache.has("newKey")).toBe(true);
	});

	it("should not evict when updating an existing entry at max capacity", () => {
		const now = Date.now();
		for (let i = 0; i < MAX_CACHE_SIZE; i++) {
			mockCache.set(`key${i}`, { data: `data${i}`, timestamp: now });
		}

		const existingKey = `key${Math.floor(MAX_CACHE_SIZE / 2)}`;
		const updatedEntry = { data: "updated", timestamp: now };
		setCacheWithPruning(existingKey, updatedEntry, mockCache);

		expect(mockCache.size).toBe(MAX_CACHE_SIZE);
		expect(mockCache.has("key0")).toBe(true); // Should not evict key0
		expect(mockCache.get(existingKey)).toEqual(updatedEntry);
	});
});
