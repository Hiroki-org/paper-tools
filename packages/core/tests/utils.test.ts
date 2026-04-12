import { describe, it, expect } from "vitest";
import { parsePositiveInt } from "../src/utils.js";

describe("parsePositiveInt", () => {
    it("should return the parsed positive integer for valid input", () => {
        expect(parsePositiveInt("1")).toBe(1);
        expect(parsePositiveInt("42")).toBe(42);
        expect(parsePositiveInt("999")).toBe(999);
    });

    it("should ignore decimal parts and return the integer part if positive", () => {
        // Number.parseInt("42.5", 10) returns 42
        expect(parsePositiveInt("42.5")).toBe(42);
    });

    it("should throw an error for 0 or negative numbers", () => {
        expect(() => parsePositiveInt("0")).toThrow("正の整数を指定してください: 0");
        expect(() => parsePositiveInt("-1")).toThrow("正の整数を指定してください: -1");
        expect(() => parsePositiveInt("-42")).toThrow("正の整数を指定してください: -42");
    });

    it("should throw an error for non-numeric strings", () => {
        expect(() => parsePositiveInt("abc")).toThrow("正の整数を指定してください: abc");
        expect(() => parsePositiveInt("")).toThrow("正の整数を指定してください: ");
    });

    it("should include optionName in the error message if provided as a string", () => {
        expect(() => parsePositiveInt("0", "limit")).toThrow("limit には正の整数を指定してください: 0");
        expect(() => parsePositiveInt("-5", "--count")).toThrow("--count には正の整数を指定してください: -5");
        expect(() => parsePositiveInt("foo", "port")).toThrow("port には正の整数を指定してください: foo");
    });

    it("should not include optionName in the error message if provided as a non-string", () => {
        expect(() => parsePositiveInt("0", 123)).toThrow("正の整数を指定してください: 0");
        expect(() => parsePositiveInt("-5", null)).toThrow("正の整数を指定してください: -5");
        expect(() => parsePositiveInt("foo", undefined)).toThrow("正の整数を指定してください: foo");
    });
});

describe("mapWithConcurrency", () => {
    it("should map items concurrently up to the limit", async () => {
        const { mapWithConcurrency } = await import("../src/utils.js");

        let concurrentExecutions = 0;
        let maxConcurrentExecutions = 0;

        const items = [1, 2, 3, 4, 5];
        const mapper = async (item: number) => {
            concurrentExecutions++;
            maxConcurrentExecutions = Math.max(maxConcurrentExecutions, concurrentExecutions);

            // Artificial delay to allow concurrent execution
            await new Promise(resolve => setTimeout(resolve, 10));

            concurrentExecutions--;
            return item * 2;
        };

        const results = await mapWithConcurrency(items, mapper, 2);

        expect(results).toEqual([2, 4, 6, 8, 10]);
        expect(maxConcurrentExecutions).toBeLessThanOrEqual(2);
    });

    it("should handle empty arrays", async () => {
        const { mapWithConcurrency } = await import("../src/utils.js");
        const results = await mapWithConcurrency([], async (x) => x, 2);
        expect(results).toEqual([]);
    });

    it("should propagate errors from the mapper", async () => {
        const { mapWithConcurrency } = await import("../src/utils.js");
        const items = [1, 2, 3];
        const mapper = async (item: number) => {
            if (item === 2) throw new Error("Test error");
            return item;
        };

        await expect(mapWithConcurrency(items, mapper, 2)).rejects.toThrow("Test error");
    });
});
