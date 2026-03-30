import { describe, expect, it } from "vitest";
import { normalizeDoi } from "../src/utils/normalize-doi.js";

describe("normalizeDoi", () => {
    it("should remove https://doi.org/ prefix", () => {
        expect(normalizeDoi("https://doi.org/10.1234/5678")).toBe("10.1234/5678");
    });

    it("should remove http://doi.org/ prefix", () => {
        expect(normalizeDoi("http://doi.org/10.1234/5678")).toBe("10.1234/5678");
    });

    it("should remove doi: prefix", () => {
        expect(normalizeDoi("doi:10.1234/5678")).toBe("10.1234/5678");
    });

    it("should remove DOI: prefix", () => {
        expect(normalizeDoi("DOI:10.1234/5678")).toBe("10.1234/5678");
    });

    it("should trim leading and trailing spaces", () => {
        expect(normalizeDoi("  https://doi.org/10.1234/5678  ")).toBe("10.1234/5678");
        expect(normalizeDoi("  doi:10.1234/5678  ")).toBe("10.1234/5678");
        expect(normalizeDoi("  10.1234/5678  ")).toBe("10.1234/5678");
    });

    it("should return the same string if no prefix is present", () => {
        expect(normalizeDoi("10.1234/5678")).toBe("10.1234/5678");
    });

    it("should handle undefined and null inputs by returning undefined", () => {
        expect(normalizeDoi(undefined)).toBeUndefined();
        expect(normalizeDoi(null)).toBeUndefined();
    });

    it("should handle empty strings and whitespace-only strings by returning empty string", () => {
        expect(normalizeDoi("")).toBe("");
        expect(normalizeDoi("   ")).toBe("");
    });
});
