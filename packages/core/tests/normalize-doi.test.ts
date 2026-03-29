import { describe, expect, it } from "vitest";
import { normalizeDoi as normalizeFromCore } from "../src/index.js";
import { normalizeDoi } from "../src/utils/normalize-doi.js";

describe("normalizeDoi", () => {
    it("normalizes DOI URL and DOI prefix", () => {
        expect(normalizeDoi(" https://doi.org/10.1145/12345 ")).toBe("10.1145/12345");
        expect(normalizeDoi("DOI:10.1145/67890")).toBe("10.1145/67890");
    });

    it("returns undefined for empty-like inputs", () => {
        expect(normalizeDoi(undefined)).toBeUndefined();
        expect(normalizeDoi(null)).toBeUndefined();
        expect(normalizeDoi("   ")).toBeUndefined();
        expect(normalizeDoi("doi:   ")).toBeUndefined();
    });

    it("is exported from package entrypoint", () => {
        expect(normalizeFromCore("10.5555/test")).toBe("10.5555/test");
    });
});
