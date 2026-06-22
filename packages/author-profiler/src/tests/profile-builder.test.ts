import { describe, expect, it } from "vitest";
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

    describe("mergeAffiliations", () => {
        it("deduplicates by name and year, ignoring case", () => {
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

        it("handles empty arrays", () => {
            expect(mergeAffiliations([], [])).toEqual([]);
            expect(mergeAffiliations([{ name: "A" }], [])).toEqual([{ name: "A" }]);
            expect(mergeAffiliations([], [{ name: "B" }])).toEqual([{ name: "B" }]);
        });

        it("treats missing year and undefined year as the same", () => {
            const merged = mergeAffiliations(
                [{ name: "A" }],
                [{ name: "A", year: undefined }]
            );
            expect(merged).toEqual([{ name: "A" }]);
        });

        it("does not deduplicate when names match but years differ", () => {
            const merged = mergeAffiliations(
                [{ name: "A", year: 2020 }],
                [{ name: "A", year: 2021 }]
            );
            expect(merged).toEqual([
                { name: "A", year: 2020 },
                { name: "A", year: 2021 }
            ]);
        });

        it("does not deduplicate when names differ but years match", () => {
            const merged = mergeAffiliations(
                [{ name: "A", year: 2020 }],
                [{ name: "B", year: 2020 }]
            );
            expect(merged).toEqual([
                { name: "A", year: 2020 },
                { name: "B", year: 2020 }
            ]);
        });
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
        ] as any);

        expect(timeline).toHaveLength(2);
        expect(timeline[0]?.year).toBe(2022);
        expect(timeline[0]?.topics[0]).toEqual({ name: "ML", score: 0.6667 });
        expect(timeline[1]?.year).toBe(2023);
        expect(timeline[1]?.topics[0]).toEqual({ name: "Systems", score: 1 });
    });
});
