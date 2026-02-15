import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { getWorkByDoi, searchWorks } = await import("../src/crossref-client.js");

describe("Crossref Client", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("getWorkByDoi should parse Crossref response", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                message: {
                    DOI: "10.1234/test",
                    title: ["Test Paper"],
                    author: [
                        { given: "Alice", family: "Smith" },
                        { given: "Bob", family: "Jones" },
                    ],
                    "published-print": { "date-parts": [[2024]] },
                    "container-title": ["ICSE"],
                    abstract: "This is an abstract.",
                    "is-referenced-by-count": 42,
                    "references-count": 10,
                    URL: "https://doi.org/10.1234/test",
                },
            }),
        });

        const paper = await getWorkByDoi("10.1234/test");
        expect(paper).toBeDefined();
        expect(paper!.title).toBe("Test Paper");
        expect(paper!.doi).toBe("10.1234/test");
        expect(paper!.authors).toHaveLength(2);
        expect(paper!.authors[0].name).toBe("Alice Smith");
        expect(paper!.citationCount).toBe(42);
    });

    it("getWorkByDoi should return null on 404", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        const paper = await getWorkByDoi("10.9999/nonexistent");
        expect(paper).toBeNull();
    });

    it("searchWorks should parse results", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                message: {
                    items: [
                        {
                            DOI: "10.1234/a",
                            title: ["Paper A"],
                            author: [{ given: "X", family: "Y" }],
                            "published-print": { "date-parts": [[2024]] },
                            "container-title": ["ASE"],
                            "is-referenced-by-count": 5,
                            "references-count": 20,
                        },
                    ],
                },
            }),
        });

        const papers = await searchWorks("test query");
        expect(papers).toHaveLength(1);
        expect(papers[0].title).toBe("Paper A");
    });
});
