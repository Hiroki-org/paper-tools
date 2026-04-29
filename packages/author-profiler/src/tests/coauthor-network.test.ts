import { describe, expect, it, vi, beforeEach } from "vitest";
import { aggregateCoauthorsFromPapers, buildCoauthorNetwork } from "../services/coauthor-network.js";
import { getAuthorPapers, type S2Paper, type S2AuthorPapersResponse } from "@paper-tools/core";

vi.mock("@paper-tools/core", () => ({
    getAuthorPapers: vi.fn(),
}));

describe("aggregateCoauthorsFromPapers", () => {
    it("aggregates coauthor counts and excludes self", () => {
        const papers = [
            {
                paperId: "p1",
                title: "A",
                authors: [
                    { authorId: "self", name: "Self" },
                    { authorId: "a1", name: "Alice" },
                    { authorId: "a2", name: "Bob" },
                ],
            },
            {
                paperId: "p2",
                title: "B",
                authors: [
                    { authorId: "self", name: "Self" },
                    { authorId: "a1", name: "Alice" },
                ],
            },
        ];

        const result = aggregateCoauthorsFromPapers("self", papers as Partial<S2Paper>[] as S2Paper[]);
        expect(result).toEqual([
            { authorId: "a1", name: "Alice", paperCount: 2 },
            { authorId: "a2", name: "Bob", paperCount: 1 },
        ]);
    });

    it("handles empty papers array", () => {
        const result = aggregateCoauthorsFromPapers("self", []);
        expect(result).toEqual([]);
    });

    it("handles papers with no authors", () => {
        const papers = [
            { paperId: "p1", title: "A" },
            { paperId: "p2", title: "B", authors: [] },
        ];
        const result = aggregateCoauthorsFromPapers("self", papers as Partial<S2Paper>[] as S2Paper[]);
        expect(result).toEqual([]);
    });

    it("handles authors with missing or empty authorId", () => {
        const papers = [
            {
                paperId: "p1",
                title: "A",
                authors: [
                    { authorId: "self", name: "Self" },
                    { authorId: "", name: "No ID 1" },
                    { name: "No ID 2" },
                    { authorId: "  ", name: "No ID 3" },
                ],
            },
        ];
        const result = aggregateCoauthorsFromPapers("self", papers as Partial<S2Paper>[] as S2Paper[]);
        expect(result).toEqual([]);
    });

    it("handles authors with missing or empty names, falling back to 'Unknown'", () => {
        const papers = [
            {
                paperId: "p1",
                title: "A",
                authors: [
                    { authorId: "self", name: "Self" },
                    { authorId: "a1" },
                    { authorId: "a2", name: "" },
                    { authorId: "a3", name: "  " },
                ],
            },
        ];
        const result = aggregateCoauthorsFromPapers("self", papers as Partial<S2Paper>[] as S2Paper[]);
        expect(result).toEqual([
            { authorId: "a1", name: "Unknown", paperCount: 1 },
            { authorId: "a2", name: "Unknown", paperCount: 1 },
            { authorId: "a3", name: "Unknown", paperCount: 1 },
        ]);
    });

    it("ignores duplicate authors within the same paper", () => {
        const papers = [
            {
                paperId: "p1",
                title: "A",
                authors: [
                    { authorId: "self", name: "Self" },
                    { authorId: "a1", name: "Alice" },
                    { authorId: "a1", name: "Alice Duplicate" },
                ],
            },
        ];
        const result = aggregateCoauthorsFromPapers("self", papers as Partial<S2Paper>[] as S2Paper[]);
        expect(result).toEqual([
            { authorId: "a1", name: "Alice", paperCount: 1 },
        ]);
    });
});

describe("buildCoauthorNetwork", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("fetches papers and aggregates coauthors correctly", async () => {
        const mockPapers = [
            {
                paperId: "p1",
                title: "Paper 1",
                authors: [
                    { authorId: "target", name: "Target Author" },
                    { authorId: "c1", name: "Coauthor One" },
                ],
            },
            {
                paperId: "p2",
                title: "Paper 2",
                authors: [
                    { authorId: "target", name: "Target Author" },
                    { authorId: "c1", name: "Coauthor One" },
                    { authorId: "c2", name: "Coauthor Two" },
                ],
            },
        ];

        vi.mocked(getAuthorPapers).mockResolvedValue({
            data: mockPapers as Partial<S2Paper>[] as S2Paper[],
            total: 2,
            offset: 0,
            next: 0,
        });

        const result = await buildCoauthorNetwork("target", { limit: 10, sort: "paperCount" });

        expect(getAuthorPapers).toHaveBeenCalledWith("target", { limit: 10, sort: "paperCount" });
        expect(result).toEqual([
            { authorId: "c1", name: "Coauthor One", paperCount: 2 },
            { authorId: "c2", name: "Coauthor Two", paperCount: 1 },
        ]);
    });

    it("uses default options when none are provided", async () => {
        vi.mocked(getAuthorPapers).mockResolvedValue({
            data: [],
            total: 0,
            offset: 0,
            next: 0,
        });

        await buildCoauthorNetwork("target");

        expect(getAuthorPapers).toHaveBeenCalledWith("target", { limit: 200, sort: undefined });
    });

    it("handles getAuthorPapers returning undefined data", async () => {
        vi.mocked(getAuthorPapers).mockResolvedValue({
            data: undefined,
            total: 0,
            offset: 0,
            next: 0,
        } as unknown as S2AuthorPapersResponse);

        const result = await buildCoauthorNetwork("target");

        expect(result).toEqual([]);
    });
});
