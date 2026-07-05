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
        it("handles empty arrays", () => {
            expect(mergeAffiliations([], [])).toEqual([]);
        });

        it("returns base array when other is empty", () => {
            const base = [{ name: "University A" }];
            expect(mergeAffiliations(base, [])).toEqual(base);
        });

        it("returns other array when base is empty", () => {
            const other = [{ name: "University A" }];
            expect(mergeAffiliations([], other)).toEqual(other);
        });

        it("deduplicates exact matches", () => {
            const merged = mergeAffiliations(
                [{ name: "University A" }],
                [{ name: "University A" }]
            );
            expect(merged).toEqual([{ name: "University A" }]);
        });

        it("deduplicates case-insensitively and preserves first case", () => {
            const merged = mergeAffiliations(
                [{ name: "University A" }],
                [{ name: "university a" }]
            );
            expect(merged).toEqual([{ name: "University A" }]);
        });

        it("deduplicates case-insensitively when year is also present", () => {
            const merged = mergeAffiliations(
                [{ name: "University A", year: 2022 }],
                [{ name: "university a", year: 2022 }]
            );
            expect(merged).toEqual([{ name: "University A", year: 2022 }]);
        });

        it("treats same name with and without year as distinct", () => {
            const merged = mergeAffiliations(
                [{ name: "University A" }],
                [{ name: "University A", year: 2022 }]
            );
            expect(merged).toEqual([
                { name: "University A" },
                { name: "University A", year: 2022 }
            ]);
        });

        it("deduplicates by name/year", () => {
            const merged = mergeAffiliations(
                [
                    { name: "University A" },
                    { name: "University B", year: 2021 },
                ],
                [
                    { name: "university a" },
                    { name: "University B", year: 2021 },
                    { name: "University B", year: 2022 },
                ]
            );

            expect(merged).toEqual([
                { name: "University A" },
                { name: "University B", year: 2021 },
                { name: "University B", year: 2022 },
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
