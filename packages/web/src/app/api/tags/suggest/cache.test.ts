import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { cache } from "./cache";

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
