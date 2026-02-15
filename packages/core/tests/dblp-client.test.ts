import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
const { searchPublications, searchVenuePublications, searchAuthors } = await import("../src/dblp-client.js");

describe("DBLP Client", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("searchPublications should parse DBLP response", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                result: {
                    hits: {
                        hit: [
                            {
                                info: {
                                    title: "Test Paper",
                                    authors: { author: [{ text: "Alice" }, { text: "Bob" }] },
                                    doi: "10.1234/test",
                                    year: "2024",
                                    venue: "ICSE",
                                    url: "https://dblp.org/rec/test",
                                },
                            },
                        ],
                    },
                },
            }),
        });

        const papers = await searchPublications("test");
        expect(papers).toHaveLength(1);
        expect(papers[0].title).toBe("Test Paper");
        expect(papers[0].authors).toHaveLength(2);
        expect(papers[0].authors[0].name).toBe("Alice");
        expect(papers[0].doi).toBe("10.1234/test");
        expect(papers[0].year).toBe(2024);
    });

    it("searchPublications should handle empty results", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                result: {
                    hits: {},
                },
            }),
        });

        const papers = await searchPublications("nonexistent");
        expect(papers).toHaveLength(0);
    });

    it("searchPublications should handle single author (not array)", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                result: {
                    hits: {
                        hit: [
                            {
                                info: {
                                    title: "Solo Paper",
                                    authors: { author: { text: "Charlie" } },
                                    year: "2023",
                                },
                            },
                        ],
                    },
                },
            }),
        });

        const papers = await searchPublications("solo");
        expect(papers).toHaveLength(1);
        expect(papers[0].authors).toHaveLength(1);
        expect(papers[0].authors[0].name).toBe("Charlie");
    });

    it("searchVenuePublications should include venue and year in query", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                result: { hits: { hit: [] } },
            }),
        });

        await searchVenuePublications("ICSE", 2026);

        const calledUrl = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain("ICSE");
        expect(calledUrl).toContain("2026");
    });
});
