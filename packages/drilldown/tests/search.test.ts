import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
const { searchByKeyword, searchByVenue, enrichWithCrossref, enrichAllWithCrossref, searchCrossref } = await import("../src/search.js");

describe("search", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("searchByKeyword should return papers from DBLP", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                result: {
                    hits: {
                        hit: [
                            {
                                info: {
                                    title: "Deep Learning Survey",
                                    authors: { author: [{ text: "Alice" }] },
                                    doi: "10.1234/dl",
                                    year: "2024",
                                    venue: "NeurIPS",
                                },
                            },
                        ],
                    },
                },
            }),
        });

        const papers = await searchByKeyword("deep learning", 10);
        expect(papers).toHaveLength(1);
        expect(papers[0].title).toBe("Deep Learning Survey");
        expect(papers[0].doi).toBe("10.1234/dl");
    });

    it("searchByVenue should pass venue and year to DBLP", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                result: { hits: { hit: [] } },
            }),
        });

        await searchByVenue("ICSE", 2024, 50);
        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain("ICSE");
        expect(calledUrl).toContain("2024");
    });

    it("enrichWithCrossref should merge Crossref metadata", async () => {
        // Mock Crossref API response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                status: "ok",
                message: {
                    title: ["Enriched Title"],
                    author: [{ given: "Bob", family: "Smith" }],
                    DOI: "10.1234/test",
                    abstract: "A great abstract",
                    subject: ["Computer Science"],
                    "is-referenced-by-count": 42,
                    "references-count": 10,
                },
            }),
        });

        const paper = {
            title: "Original Title",
            authors: [{ name: "Alice" }],
            doi: "10.1234/test",
        };

        const enriched = await enrichWithCrossref(paper);
        expect(enriched.title).toBe("Original Title"); // 元のタイトルを保持
        expect(enriched.abstract).toBe("A great abstract");
        expect(enriched.citationCount).toBe(42);
    });

    it("enrichWithCrossref should return paper as-is if no DOI", async () => {
        const paper = { title: "No DOI Paper", authors: [{ name: "Alice" }] };
        const result = await enrichWithCrossref(paper);
        expect(result).toEqual(paper);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("enrichAllWithCrossref should honor the requested concurrency", async () => {
        let activeRequests = 0;
        let peakConcurrency = 0;

        mockFetch.mockImplementation(async () => {
            activeRequests += 1;
            peakConcurrency = Math.max(peakConcurrency, activeRequests);
            await new Promise((resolve) => setTimeout(resolve, 5));
            activeRequests -= 1;

            return {
                ok: true,
                status: 200,
                json: async () => ({
                    status: "ok",
                    message: {
                        title: ["Enriched Title"],
                        author: [{ given: "Bob", family: "Smith" }],
                        DOI: "10.1234/test",
                    },
                }),
            };
        });

        const papers = [
            { title: "Paper 1", authors: [{ name: "Alice" }], doi: "10.1234/test-1" },
            { title: "Paper 2", authors: [{ name: "Alice" }], doi: "10.1234/test-2" },
            { title: "Paper 3", authors: [{ name: "Alice" }], doi: "10.1234/test-3" },
        ];

        const enriched = await enrichAllWithCrossref(papers, 2);

        expect(enriched).toHaveLength(3);
        expect(peakConcurrency).toBeLessThanOrEqual(2);
        expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("searchCrossref should call Crossref API and return papers", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                message: {
                    items: [
                        {
                            title: ["Machine Learning Basics"],
                            author: [{ given: "John", family: "Doe" }],
                            DOI: "10.5678/ml",
                            "container-title": ["Journal of ML"],
                        },
                    ],
                },
            }),
        });

        const papers = await searchCrossref("machine learning", 15);
        expect(papers).toHaveLength(1);
        expect(papers[0].title).toBe("Machine Learning Basics");
        expect(papers[0].doi).toBe("10.5678/ml");
        expect(papers[0].venue).toBe("Journal of ML");

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain("query=machine+learning");
        expect(calledUrl).toContain("rows=15");
    });
});
