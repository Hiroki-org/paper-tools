import { describe, expect, it } from "vitest";
import { aggregateCoauthorsFromPapers } from "../services/coauthor-network.js";

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

        const result = aggregateCoauthorsFromPapers("self", papers as any);
        expect(result).toEqual([
            { authorId: "a1", name: "Alice", paperCount: 2 },
            { authorId: "a2", name: "Bob", paperCount: 1 },
        ]);
    });
});
