import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const {
    searchAuthors,
    getAuthor,
    getAuthorPapers,
} = await import("../src/index.js");

describe("Author API clients", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("searchAuthors returns semantic scholar candidates", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                total: 1,
                offset: 0,
                data: [{ authorId: "123", name: "Alice" }],
            }),
        });

        const res = await searchAuthors("Alice", { limit: 5 });
        expect(res.data[0]?.authorId).toBe("123");
        expect(res.data[0]?.name).toBe("Alice");
    });

    it("getAuthor returns detail", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                authorId: "123",
                name: "Alice",
                hIndex: 42,
            }),
        });

        const res = await getAuthor("123");
        expect(res.authorId).toBe("123");
        expect(res.hIndex).toBe(42);
    });

    it("getAuthorPapers returns papers", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                total: 1,
                offset: 0,
                data: [{ paperId: "p1", title: "Paper" }],
            }),
        });

        const res = await getAuthorPapers("123", { limit: 10, sort: "citationCount:desc" });
        expect(res.data[0]?.paperId).toBe("p1");
    });
});
