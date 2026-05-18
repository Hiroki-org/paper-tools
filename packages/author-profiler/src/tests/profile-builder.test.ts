import { describe, expect, it } from "vitest";
import type { S2Paper } from "@paper-tools/core";
import {
    buildTopicTimelineFromPapers,
    mergeAffiliations,
    toCorePaper,
} from "../services/profile-builder.js";

describe("profile-builder helpers", () => {
    it("toCorePaper maps S2Paper into core Paper", () => {
        const mapped = toCorePaper({
            paperId: "p1",
            title: "Test Paper",
            year: 2024,
            venue: "ICSE",
            abstract: "A",
            url: "https://example.com/p1",
            citationCount: 12,
            referenceCount: 5,
            fieldsOfStudy: ["SE"],
            externalIds: { DOI: "10.1/x" },
            authors: [{ name: "Alice" }],
        });

        expect(mapped).toEqual({
            title: "Test Paper",
            authors: [{ name: "Alice" }],
            doi: "10.1/x",
            year: 2024,
            venue: "ICSE",
            abstract: "A",
            url: "https://example.com/p1",
            citationCount: 12,
            referenceCount: 5,
            keywords: ["SE"],
        });
    });

    it("mergeAffiliations deduplicates by name/year", () => {
        const merged = mergeAffiliations(
            [
                { name: "University A" },
                { name: "University B", year: 2021 },
            ],
            [
                { name: "university a" },
                { name: "University B", year: 2021 },
                { name: "University B", year: 2022 },
            ],
        );

        expect(merged).toEqual([
            { name: "University A" },
            { name: "University B", year: 2021 },
            { name: "University B", year: 2022 },
        ]);
    });

    it("buildTopicTimelineFromPapers creates per-year topic distributions", () => {
        const timeline = buildTopicTimelineFromPapers([
            {
                paperId: "p1",
                title: "A",
                year: 2022,
                fieldsOfStudy: ["ML", "NLP"],
            },
            {
                paperId: "p2",
                title: "B",
                year: 2022,
                fieldsOfStudy: ["ML"],
            },
            {
                paperId: "p3",
                title: "C",
                year: 2023,
                fieldsOfStudy: ["Systems"],
            },
        ] as unknown as S2Paper[]);

        expect(timeline).toHaveLength(2);
        expect(timeline[0]?.year).toBe(2022);
        expect(timeline[0]?.topics[0]).toEqual({ name: "ML", score: 0.6667 });
        expect(timeline[1]?.year).toBe(2023);
        expect(timeline[1]?.topics[0]).toEqual({ name: "Systems", score: 1 });
    });

    it("buildTopicTimelineFromPapers skips incomplete topic data", () => {
        expect(buildTopicTimelineFromPapers([])).toEqual([]);

        const timeline = buildTopicTimelineFromPapers([
            {
                paperId: "no-year",
                title: "No year",
                fieldsOfStudy: ["ML"],
            },
            {
                paperId: "no-fields",
                title: "No fields",
                year: 2022,
            },
            {
                paperId: "non-array-fields",
                title: "Bad fields",
                year: 2022,
                fieldsOfStudy: "ML",
            },
            {
                paperId: "empty-fields",
                title: "Empty fields",
                year: 2023,
                fieldsOfStudy: [],
            },
            {
                paperId: "valid",
                title: "Valid",
                year: 2024,
                fieldsOfStudy: ["Systems"],
            },
        ] as unknown as S2Paper[]);

        expect(timeline).toEqual([
            { year: 2024, topics: [{ name: "Systems", score: 1 }] },
        ]);
    });
});
