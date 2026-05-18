import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { getWorkByDoi, searchWorks } = await import("../src/crossref-client.js");

describe("Crossref Client", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("getWorkByDoi should throw error on non-404 failure", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 403,
            statusText: "Forbidden"
        });

        await expect(getWorkByDoi("10.1234/error")).rejects.toThrow("Crossref API error: 403 Forbidden");
    });

    it("searchWorks should parse results with missing authors", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                message: {
                    items: [
                        {
                            DOI: "10.1234/b",
                            title: ["Paper B"]
                        },
                    ],
                },
            }),
        });

        const papers = await searchWorks("test missing author");
        expect(papers).toHaveLength(1);
        expect(papers[0].title).toBe("Paper B");
        expect(papers[0].authors).toHaveLength(0);
    });

    it("buildHeaders should include User-Agent if mailto is set", async () => {
        process.env["CROSSREF_MAILTO"] = "test@example.com";
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                message: { items: [] },
            }),
        });

        await searchWorks("test query");

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("mailto=test%40example.com"),
            expect.objectContaining({
                headers: expect.objectContaining({
                    "User-Agent": "paper-tools (mailto:test@example.com)"
                })
            })
        );
        delete process.env["CROSSREF_MAILTO"];
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
