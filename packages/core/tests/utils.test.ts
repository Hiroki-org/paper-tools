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
