import { beforeEach, describe, expect, it, vi } from "vitest";
import * as rateLimiter from "../src/rate-limiter.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const {
    getRecommendationsForPaper,
    getRecommendations,
    getPaper,
    getAuthor,
    searchAuthors,
    getAuthorPapers,
} = await import("../src/semantic-scholar-client.js");

describe("Semantic Scholar Client", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("getRecommendationsForPaper should parse recommended papers", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                recommendedPapers: [
                    {
                        paperId: "p1",
                        title: "Recommended Paper 1",
                        year: 2024,
                        authors: [{ name: "Alice" }],
                    },
                ],
            }),
        });

        const result = await getRecommendationsForPaper("DOI:10.1000/xyz");
        expect(result.recommendedPapers.length).toBe(1);
        expect(result.recommendedPapers[0]?.paperId).toBe("p1");
    });

    it("getRecommendations POST should include positive/negative IDs", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ recommendedPapers: [] }),
        });

        await getRecommendations(["p1", "p2"], ["n1"], { limit: 5 });

        const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(requestInit.method).toBe("POST");
        expect(typeof requestInit.body).toBe("string");
        expect(JSON.parse(requestInit.body as string)).toEqual({
            positivePaperIds: ["p1", "p2"],
            negativePaperIds: ["n1"],
        });
    });

    it("getPaper should parse paper details", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                paperId: "paper-1",
                title: "A Study on Recommenders",
                year: 2023,
                externalIds: { DOI: "10.1000/abc" },
            }),
        });

        const paper = await getPaper("paper-1");
        expect(paper.paperId).toBe("paper-1");
        expect(paper.externalIds?.DOI).toBe("10.1000/abc");
    });

    it("getPaper should throw formatted error on API failure", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: "Not Found",
            text: async () => "Not Found"
        });

        await expect(getPaper("bad-id")).rejects.toThrow("Semantic Scholar API error: 404 Not Found - Not Found");
    });

    it("getAuthor should parse author details", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                authorId: "author-1",
                name: "Alice Smith",
                hIndex: 42,
                paperCount: 100,
            }),
        });

        const author = await getAuthor("author-1");
        expect(author.authorId).toBe("author-1");
        expect(author.name).toBe("Alice Smith");
        expect(author.hIndex).toBe(42);
        expect(author.paperCount).toBe(100);
    });

    it("searchAuthors should pass parameters and parse author search results", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                total: 1,
                offset: 0,
                data: [{ authorId: "author-2", name: "Bob Jones" }],
            }),
        });

        const response = await searchAuthors("Bob", { limit: 5 });
        expect(response.total).toBe(1);
        expect(response.offset).toBe(0);
        expect(response.data[0]?.authorId).toBe("author-2");
        expect(response.data[0]?.name).toBe("Bob Jones");

        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toContain("query=Bob");
        expect(url).toContain("limit=5");
    });

    it("should attach x-api-key header when S2_API_KEY is set", async () => {
        const previous = process.env["S2_API_KEY"];
        process.env["S2_API_KEY"] = "dummy-key";
        vi.resetModules();

        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ recommendedPapers: [] }),
        });

        const { getRecommendationsForPaper: fnWithKey } = await import("../src/semantic-scholar-client.js");
        await fnWithKey("paper-key-test");
        const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect((requestInit.headers as Record<string, string>)["x-api-key"]).toBe("dummy-key");

        if (previous === undefined) {
            delete process.env["S2_API_KEY"];
        } else {
            process.env["S2_API_KEY"] = previous;
        }
    });

    it("parseResponse should throw formatted error on failed response", async () => {
        const spy = vi.spyOn(rateLimiter, "fetchWithRetry").mockResolvedValueOnce({
            ok: false,
            status: 400,
            statusText: "Bad Request",
            text: async () => "Invalid ID",
        } as unknown as Response);

        await expect(getPaper("bad-id")).rejects.toThrow("Semantic Scholar API error: 400 Bad Request - Invalid ID");
        spy.mockRestore();
    });

    it("getAuthorPapers should pass parameters and parse author papers", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                total: 2,
                offset: 0,
                next: 2,
                data: [
                    {
                        paperId: "paper-1",
                        title: "Test Paper 1",
                        year: 2024,
                        venue: "Test Venue",
                    },
                    {
                        paperId: "paper-2",
                        title: "Test Paper 2",
                        year: 2023,
                    }
                ],
            }),
        });

        const response = await getAuthorPapers("author-1", { limit: 10, sort: "citationCount:desc" });
        expect(response.total).toBe(2);
        expect(response.offset).toBe(0);
        expect(response.data.length).toBe(2);
        expect(response.data[0]?.paperId).toBe("paper-1");
        expect(response.data[0]?.title).toBe("Test Paper 1");

        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toContain("author/author-1/papers");
        expect(url).toContain("limit=10");
        expect(url).toContain("sort=citationCount%3Adesc");
    });
});
