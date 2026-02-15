import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
const { extractKeywords, drilldown } = await import("../src/drilldown.js");

describe("extractKeywords", () => {
    it("should extract keywords from paper titles", () => {
        const papers = [
            { title: "Machine Learning for Software Engineering", authors: [] },
            { title: "Deep Learning Applications in Software Testing", authors: [] },
            { title: "Machine Learning Techniques for Bug Detection", authors: [] },
        ];

        const keywords = extractKeywords(papers, 5);
        expect(keywords.length).toBeGreaterThan(0);
        expect(keywords.length).toBeLessThanOrEqual(5);
        // "machine", "learning", "software" should appear frequently
        expect(keywords).toContain("machine");
        expect(keywords).toContain("learning");
        expect(keywords).toContain("software");
    });

    it("should give higher weight to paper keywords", () => {
        const papers = [
            {
                title: "A Paper About Cats",
                authors: [],
                keywords: ["neural networks"],
            },
            {
                title: "Another Paper",
                authors: [],
                keywords: ["neural networks"],
            },
        ];

        const keywords = extractKeywords(papers, 3);
        // tokenize で "neural networks" は分割されるため、"neural" と "networks" は別扱いになる
        // keywords フィールドも tokenize されるため、各トークンは重み 2 倍で登録される
        expect(keywords).toContain("neural");
        expect(keywords).toContain("networks");
    });

    it("should filter out stopwords", () => {
        const papers = [
            { title: "The Impact of Using Machine Learning in the Field", authors: [] },
        ];

        const keywords = extractKeywords(papers, 10);
        expect(keywords).not.toContain("the");
        expect(keywords).not.toContain("of");
        expect(keywords).not.toContain("in");
    });

    it("should return empty array for empty input", () => {
        const keywords = extractKeywords([], 10);
        expect(keywords).toEqual([]);
    });
});

describe("drilldown", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("should return seed papers at level 0", async () => {
        // Mock DBLP search for drilldown level 1
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                result: {
                    hits: {
                        hit: [
                            {
                                info: {
                                    title: "Found Paper",
                                    authors: { author: [{ text: "Bob" }] },
                                    doi: "10.5678/found",
                                    year: "2024",
                                },
                            },
                        ],
                    },
                },
            }),
        });

        const seedPapers = [
            { title: "Machine Learning for Testing", authors: [{ name: "Alice" }], doi: "10.1234/seed" },
        ];

        const results = await drilldown(seedPapers, 1, 5);
        expect(results[0].level).toBe(0);
        expect(results[0].papers).toEqual(seedPapers);
    });

    it("should explore deeper levels", async () => {
        // Mock DBLP search for level 1
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                result: {
                    hits: {
                        hit: [
                            {
                                info: {
                                    title: "Level 1 Paper",
                                    authors: { author: [{ text: "Bob" }] },
                                    doi: "10.5678/level1",
                                    year: "2024",
                                },
                            },
                        ],
                    },
                },
            }),
        });

        const seedPapers = [
            { title: "Software Testing with AI", authors: [{ name: "Alice" }], doi: "10.1234/seed" },
        ];

        const results = await drilldown(seedPapers, 1, 10);
        expect(results.length).toBeGreaterThan(1);
        expect(results[0].level).toBe(0);
        expect(results[1].level).toBe(1);
    });

    it("should deduplicate papers by DOI", async () => {
        // Return paper with same DOI as seed
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                result: {
                    hits: {
                        hit: [
                            {
                                info: {
                                    title: "Same Paper",
                                    authors: { author: [{ text: "Alice" }] },
                                    doi: "10.1234/seed",
                                    year: "2024",
                                },
                            },
                            {
                                info: {
                                    title: "New Paper",
                                    authors: { author: [{ text: "Bob" }] },
                                    doi: "10.5678/new",
                                    year: "2024",
                                },
                            },
                        ],
                    },
                },
            }),
        });

        const seedPapers = [
            { title: "Seed Paper", authors: [{ name: "Alice" }], doi: "10.1234/seed" },
        ];

        const results = await drilldown(seedPapers, 1, 10);
        expect(results.length).toBeGreaterThan(1);
        const level1Papers = results[1].papers;
        const hasDuplicate = level1Papers.some((p) => p.doi?.toLowerCase() === "10.1234/seed");
        expect(hasDuplicate).toBe(false);
    });
});
