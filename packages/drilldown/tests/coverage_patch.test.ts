import { describe, expect, it, vi, beforeEach } from "vitest";
import { drilldown, extractKeywords } from "../src/drilldown.js";
import * as searchModule from "../src/search.js";

vi.mock("../src/search.js", async (importOriginal) => {
    return {
        ...await importOriginal<typeof import("../src/search.js")>(),
        searchByKeyword: vi.fn(),
        enrichAllWithCrossref: vi.fn()
    };
});

describe("coverage patch", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("should filter out papers by title if doi is missing", async () => {
        vi.mocked(searchModule.searchByKeyword).mockResolvedValueOnce([
            { id: "1", title: "Missing DOI Title", year: 2024 },
            { id: "2", title: "Missing DOI Title", year: 2024 },
        ]);

        const results = await drilldown([{ id: "seed", title: "Seed Title", year: 2024, keywords: ["test"] }]);

        expect(results || []).toHaveLength(2);
        expect(results[1].papers).toHaveLength(1);
    });

    it("should break when all found papers are filtered out", async () => {
        vi.mocked(searchModule.searchByKeyword).mockResolvedValueOnce([
            { id: "1", doi: "10.000/seed", title: "Seed Title", year: 2024 },
        ]);

        const results = await drilldown([{ id: "seed", doi: "10.000/seed", title: "Seed Title", year: 2024, keywords: ["test"] }], 1, 10, false);

        expect(results || []).toHaveLength(1);
    });

    it("should handle error during crossref enrichment throwing a string", async () => {
        vi.mocked(searchModule.searchByKeyword).mockResolvedValueOnce([
            { id: "1", doi: "10.000/1", title: "Test", year: 2024 },
        ]);

        vi.mocked(searchModule.enrichAllWithCrossref).mockRejectedValueOnce("String Error");

        const results = await drilldown([{ id: "seed", doi: "10.000/seed", title: "Seed Title", year: 2024, keywords: ["test"] }], 1, 10, true);

        expect(results || []).toHaveLength(2);
    });

    it("should handle extractKeywords branch", async () => {
        const results = extractKeywords([
            { id: "1", title: "Testing title extract" },
            { id: "2", title: "Missing both abstract and keywords extract" },
            { id: "3", title: "With abstract extract", abstract: "Abstract text" }
        ]);

        expect(results || []).toHaveLength(7);
    });

    it("should break when found is empty", async () => {
        vi.mocked(searchModule.searchByKeyword).mockResolvedValueOnce([
            { id: "1", title: "Test", year: 2024 },
        ]);
        vi.mocked(searchModule.searchByKeyword).mockResolvedValueOnce([]);

        const results = await drilldown([{ id: "seed", title: "Seed Title", year: 2024, keywords: ["test"] }], 2, 10, false);

        expect(results || []).toHaveLength(2);
    });
});
