import { describe, expect, it } from "vitest";
import { aggregateCoauthorsFromPapers } from "../services/coauthor-network.js";
import { type S2Paper } from "@paper-tools/core";

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
});
