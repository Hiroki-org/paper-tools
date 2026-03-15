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
        // Suppress console.warn to keep test output clean
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it("returns null if neither doi nor title is provided", async () => {
        const result = await fetchBibtex({});
        expect(result).toBeNull();
    });

    it("returns null if doi and title are only whitespace", async () => {
        const result = await fetchBibtex({ doi: "   ", title: " \t " });
        expect(result).toBeNull();
    });

    it("uses Crossref for DOI first", async () => {
        fetchWithRetry.mockResolvedValueOnce({
            text: async () => "@article{a, title={A}}",
        });

        const result = await fetchBibtex({ doi: "10.1000/xyz" });
        expect(result?.source).toBe("crossref");
        expect(fetchWithRetry).toHaveBeenCalledTimes(1);
        expect(fetchWithRetry).toHaveBeenCalledWith(
            "https://api.crossref.org/works/10.1000%2Fxyz/transform/application/x-bibtex",
            expect.any(Object)
        );
    });

    it("handles non-BibTeX response from Crossref and falls back if title exists", async () => {
        // Crossref returns invalid format
        fetchWithRetry.mockResolvedValueOnce({
            text: async () => "Not a bibtex",
        });

        // DBLP fallback
        searchPublications.mockResolvedValueOnce([
            { title: "A", url: "https://dblp.org/rec/conf/icse/FooBar2024" },
        ]);
        fetchWithRetry.mockResolvedValueOnce({
            text: async () => "@inproceedings{b, title={B}}",
        });

        const result = await fetchBibtex({ doi: "10.1000/xyz", title: "Fuzzing" });
        expect(result?.source).toBe("dblp");
        // Warning should be logged
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("[bibtex] Crossref fetch failed for DOI 10.1000/xyz:"),
            "Crossref returned non-BibTeX response"
        );
    });

    it("falls back to DBLP when Crossref fails and title exists", async () => {
        // Crossref fails completely
        fetchWithRetry.mockRejectedValueOnce(new Error("Network Error"));

        // DBLP succeeds
        searchPublications.mockResolvedValueOnce([
            { title: "A", url: "https://dblp.org/rec/conf/icse/FooBar2024" },
        ]);
        fetchWithRetry.mockResolvedValueOnce({
            text: async () => "@inproceedings{b, title={B}}",
        });

        const result = await fetchBibtex({ doi: "10.1000/xyz", title: "Fuzzing" });
        expect(result?.source).toBe("dblp");
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

    it("falls back to Semantic Scholar when DBLP returns no candidates", async () => {
        // DBLP returns empty
        searchPublications.mockResolvedValueOnce([]);

        // Semantic Scholar succeeds
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
        expect(searchPublications).toHaveBeenCalledTimes(1);
        expect(searchPapers).toHaveBeenCalledTimes(1);
    });

    it("falls back to Semantic Scholar when DBLP candidates lack URLs", async () => {
        // DBLP candidate missing url
        searchPublications.mockResolvedValueOnce([
            { title: "No URL" }
        ]);

        // Semantic Scholar succeeds
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

    it("falls back to Semantic Scholar when DBLP returns non-BibTeX", async () => {
        // DBLP returns something that doesn't start with @
        searchPublications.mockResolvedValueOnce([
            { title: "A", url: "https://dblp.org/rec/conf/icse/FooBar2024" },
        ]);
        fetchWithRetry.mockResolvedValueOnce({
            text: async () => "Not a bibtex",
        });

        // Semantic Scholar succeeds
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

    it("falls back to Semantic Scholar DOI resolution and fails if Semantic Scholar throws", async () => {
        // DBLP throws
        searchPublications.mockRejectedValueOnce(new Error("DBLP Error"));

        // Semantic Scholar throws
        searchPapers.mockRejectedValueOnce(new Error("Semantic Scholar Error"));

        const result = await fetchBibtex({ title: "Fuzzing" });
        expect(result).toBeNull();
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("[bibtex] DBLP fetch failed for title \"Fuzzing\":"),
            "DBLP Error"
        );
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("[bibtex] Semantic Scholar fallback failed for title \"Fuzzing\":"),
            "Semantic Scholar Error"
        );
    });

    it("returns null if Semantic Scholar returns papers without DOI", async () => {
        // DBLP fails
        searchPublications.mockResolvedValueOnce([]);

        // Semantic Scholar has no DOI
        searchPapers.mockResolvedValueOnce({
            data: [
                {
                    paperId: "p1",
                    title: "Fuzzing Study",
                    externalIds: { CorpusId: "123" },
                },
            ],
        });

        const result = await fetchBibtex({ title: "Fuzzing" });
        expect(result).toBeNull();
    });

    it("returns null if Semantic Scholar returns papers with empty externalIds", async () => {
        // DBLP fails
        searchPublications.mockResolvedValueOnce([]);

        // Semantic Scholar has empty externalIds
        searchPapers.mockResolvedValueOnce({
            data: [
                {
                    paperId: "p1",
                    title: "Fuzzing Study",
                    externalIds: {},
                },
            ],
        });

        const result = await fetchBibtex({ title: "Fuzzing" });
        expect(result).toBeNull();
    });

    it("returns null if Semantic Scholar returns empty response", async () => {
        // DBLP fails
        searchPublications.mockResolvedValueOnce([]);

        // Semantic Scholar empty response
        searchPapers.mockResolvedValueOnce({
            data: [],
        });

        const result = await fetchBibtex({ title: "Fuzzing" });
        expect(result).toBeNull();
    });

    it("returns null when all methods fail entirely", async () => {
        fetchWithRetry.mockRejectedValueOnce(new Error("Crossref Error"));
        searchPublications.mockRejectedValueOnce(new Error("DBLP Error"));
        searchPapers.mockRejectedValueOnce(new Error("Semantic Scholar Error"));

        const result = await fetchBibtex({ doi: "10.1000/xyz", title: "Fuzzing" });
        expect(result).toBeNull();
    });
});

describe("additional edge cases", () => {
    it("handles non-Error objects in catch blocks", async () => {
        fetchWithRetry.mockRejectedValueOnce("String error crossref");
        searchPublications.mockRejectedValueOnce("String error dblp");
        searchPapers.mockRejectedValueOnce("String error semanticscholar");

        const { fetchBibtex } = await import("../src/bibtex-fetcher.js");
        const result = await fetchBibtex({ doi: "10.1000/xyz", title: "Fuzzing" });
        expect(result).toBeNull();
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Crossref fetch failed"), "String error crossref");
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("DBLP fetch failed"), "String error dblp");
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Semantic Scholar fallback failed"), "String error semanticscholar");
    });
});

describe("more edge cases", () => {
    it("handles DBLP candidate missing match", async () => {
        const { fetchBibtex } = await import("../src/bibtex-fetcher.js");
        searchPublications.mockResolvedValueOnce([{ url: "invalid-url" }]);
        searchPapers.mockResolvedValueOnce({ data: [] });
        const result = await fetchBibtex({ title: "Fuzzing" });
        expect(result).toBeNull();
    });

    it("handles Semantic Scholar without papers data", async () => {
        const { fetchBibtex } = await import("../src/bibtex-fetcher.js");
        searchPublications.mockResolvedValueOnce([]);
        searchPapers.mockResolvedValueOnce({}); // no data array
        const result = await fetchBibtex({ title: "Fuzzing" });
        expect(result).toBeNull();
    });
});
