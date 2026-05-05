import { describe, expect, it } from "vitest";
import { DEFAULT_CONCURRENCY, mapConcurrent } from "../src/graph.js";

describe("mapConcurrent", () => {
    it("limits concurrent work while preserving result order", async () => {
        const items = Array.from({ length: DEFAULT_CONCURRENCY + 5 }, (_, index) => index);
        let active = 0;
        let maxActive = 0;

        const results = await mapConcurrent(
            items,
            async (item) => {
                active++;
                maxActive = Math.max(maxActive, active);
                await new Promise((resolve) => setTimeout(resolve, 1));
                active--;
                return item * 2;
            },
            DEFAULT_CONCURRENCY,
        );

        expect(results).toEqual(items.map((item) => item * 2));
        expect(maxActive).toBe(DEFAULT_CONCURRENCY);
    });

    it("rejects invalid concurrency limits", async () => {
        await expect(
            mapConcurrent([1], async (item) => item, 0),
        ).rejects.toThrow("Concurrency must be at least 1");
    });
});
