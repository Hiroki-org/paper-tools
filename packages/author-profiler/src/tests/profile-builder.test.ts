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

	it("mergeAffiliations deduplicates by name/year", () => {
		const merged = mergeAffiliations(
			[{ name: "University A" }, { name: "University B", year: 2021 }],
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

	describe("buildTopicTimelineFromPapers", () => {
		it("creates per-year topic distributions", () => {
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
			] as unknown as import("@paper-tools/core").S2Paper[]);

			expect(timeline).toHaveLength(2);
			expect(timeline[0]?.year).toBe(2022);
			expect(timeline[0]?.topics[0]).toEqual({ name: "ML", score: 0.6667 });
			expect(timeline[1]?.year).toBe(2023);
			expect(timeline[1]?.topics[0]).toEqual({ name: "Systems", score: 1 });
		});

		it("handles empty paper lists", () => {
			const timeline = buildTopicTimelineFromPapers([]);
			expect(timeline).toEqual([]);
		});

		it("ignores papers without year or valid fieldsOfStudy", () => {
			const timeline = buildTopicTimelineFromPapers([
				{ paperId: "p1", title: "A", fieldsOfStudy: ["ML"] }, // missing year
				{ paperId: "p2", title: "B", year: 2022, fieldsOfStudy: null }, // invalid fieldsOfStudy
				{ paperId: "p3", title: "C", year: 2022, fieldsOfStudy: "ML" }, // invalid fieldsOfStudy type
			] as unknown as import("@paper-tools/core").S2Paper[]);
			expect(timeline).toEqual([]);
		});

		it("limits to top 5 topics per year sorted by frequency", () => {
			const timeline = buildTopicTimelineFromPapers([
				{
					paperId: "p1",
					year: 2022,
					fieldsOfStudy: ["A", "B", "C", "D", "E", "F"],
				},
				{ paperId: "p2", year: 2022, fieldsOfStudy: ["A", "B", "C", "D", "E"] },
				{ paperId: "p3", year: 2022, fieldsOfStudy: ["A", "B", "C", "D"] },
				{ paperId: "p4", year: 2022, fieldsOfStudy: ["A", "B", "C"] },
				{ paperId: "p5", year: 2022, fieldsOfStudy: ["A", "B"] },
				{ paperId: "p6", year: 2022, fieldsOfStudy: ["A"] },
			] as unknown as import("@paper-tools/core").S2Paper[]);

			expect(timeline).toHaveLength(1);
			const topics = timeline[0]?.topics;
			expect(topics).toHaveLength(5);
			expect(topics?.map((t) => t.name)).toEqual(["A", "B", "C", "D", "E"]);
		});

		it("sorts timeline entries by year ascending", () => {
			const timeline = buildTopicTimelineFromPapers([
				{ paperId: "p1", year: 2023, fieldsOfStudy: ["X"] },
				{ paperId: "p2", year: 2021, fieldsOfStudy: ["Y"] },
				{ paperId: "p3", year: 2022, fieldsOfStudy: ["Z"] },
			] as unknown as import("@paper-tools/core").S2Paper[]);

			expect(timeline).toHaveLength(3);
			expect(timeline.map((t) => t.year)).toEqual([2021, 2022, 2023]);
		});
	});
});
