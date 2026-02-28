import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithRetry = vi.fn();
const searchPublications = vi.fn();
const searchPapers = vi.fn();

vi.mock("@paper-tools/core", () => ({
    fetchWithRetry,
    searchPublications,
    searchPapers,
}));

const { fetchBibtex } = await import("../src/bibtex-fetcher.js");

describe("fetchBibtex", () => {
    beforeEach(() => {
        fetchWithRetry.mockReset();
        searchPublications.mockReset();
        searchPapers.mockReset();
    });

    it("uses Crossref for DOI first", async () => {
        fetchWithRetry.mockResolvedValueOnce({
            text: async () => "@article{a, title={A}}",
        });

        const result = await fetchBibtex({ doi: "10.1000/xyz" });
        expect(result?.source).toBe("crossref");
        expect(fetchWithRetry).toHaveBeenCalledTimes(1);
    });

    it("falls back to DBLP when DOI is unavailable", async () => {
        searchPublications.mockResolvedValueOnce([
            { title: "A", url: "https://dblp.org/rec/conf/icse/FooBar2024" },
        ]);
        fetchWithRetry.mockResolvedValueOnce({
            text: async () => "@inproceedings{b, title={B}}",
        });

        const result = await fetchBibtex({ title: "Fuzzing" });
        expect(result?.source).toBe("dblp");
        expect(fetchWithRetry).toHaveBeenCalledTimes(1);
    });

    it("falls back to Semantic Scholar DOI resolution", async () => {
        searchPublications.mockResolvedValueOnce([]);
        searchPapers.mockResolvedValueOnce({
            data: [
                {
                    paperId: "p1",
                    title: "Fuzzing Study",
                    externalIds: { DOI: "10.1145/1234" },
                },
            ],
        });
        fetchWithRetry.mockResolvedValueOnce({
            text: async () => "@article{c, title={C}}",
        });

        const result = await fetchBibtex({ title: "Fuzzing" });
        expect(result?.source).toBe("semanticScholar");
    });
});
