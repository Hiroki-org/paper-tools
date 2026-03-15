import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Conference, Paper } from "@paper-tools/core";
import { enrichWithDblp, searchConferencePapers } from "../src/dblp-integration.js";

// Mock @paper-tools/core
vi.mock("@paper-tools/core", () => ({
    searchVenuePublications: vi.fn(),
}));

import { searchVenuePublications } from "@paper-tools/core";

const mockSearchVenuePublications = vi.mocked(searchVenuePublications);

describe("DBLP Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("enrichWithDblp", () => {
        const baseConference: Conference = {
            name: "ICSE 2026",
            year: 2026,
            tracks: [],
            importantDates: [],
        };

        it("should return the conference as-is if DBLP returns no papers and existing is empty", async () => {
            mockSearchVenuePublications.mockResolvedValueOnce([]);

            const result = await enrichWithDblp(baseConference, "icse");

            expect(result.acceptedPapers).toEqual([]);
            expect(mockSearchVenuePublications).toHaveBeenCalledWith("icse", 2026, 100);
        });

        it("should return the existing papers if DBLP returns no papers", async () => {
            mockSearchVenuePublications.mockResolvedValueOnce([]);

            const existingPaper: Paper = {
                title: "Existing Paper",
                authors: [{ name: "Alice" }],
                doi: "10.1234/5678",
            };

            const confWithPapers = { ...baseConference, acceptedPapers: [existingPaper] };
            const result = await enrichWithDblp(confWithPapers, "icse");

            expect(result.acceptedPapers).toEqual([existingPaper]);
        });

        it("should merge using DOI as the key", async () => {
            const existingPaper: Paper = {
                title: "Existing Paper",
                authors: [{ name: "Alice" }],
                doi: "10.1234/5678",
            };

            const dblpPaper: Paper = {
                title: "DBLP Paper Name (Might differ slightly)",
                authors: [{ name: "Alice" }, { name: "Bob" }],
                doi: "10.1234/5678", // Same DOI
                year: 2026,
            };

            mockSearchVenuePublications.mockResolvedValueOnce([dblpPaper]);

            const confWithPapers = { ...baseConference, acceptedPapers: [existingPaper] };
            const result = await enrichWithDblp(confWithPapers, "icse");

            expect(result.acceptedPapers?.length).toBe(1);
            expect(result.acceptedPapers?.[0]).toEqual({
                title: "DBLP Paper Name (Might differ slightly)", // DBLP paper overwrites
                authors: [{ name: "Alice" }, { name: "Bob" }], // DBLP paper overwrites
                doi: "10.1234/5678",
                year: 2026, // Added from DBLP
            });
        });

        it("should merge using lowercase title as the key if DOI is missing", async () => {
            const existingPaper: Paper = {
                title: "Existing Paper Title",
                authors: [{ name: "Alice" }],
            };

            const dblpPaper: Paper = {
                title: "existing paper TITLE", // Differing case, but same lowercase
                authors: [{ name: "Alice" }, { name: "Bob" }],
                year: 2026,
            };

            mockSearchVenuePublications.mockResolvedValueOnce([dblpPaper]);

            const confWithPapers = { ...baseConference, acceptedPapers: [existingPaper] };
            const result = await enrichWithDblp(confWithPapers, "icse");

            expect(result.acceptedPapers?.length).toBe(1);
            expect(result.acceptedPapers?.[0]).toEqual({
                title: "existing paper TITLE", // DBLP overwrites
                authors: [{ name: "Alice" }, { name: "Bob" }],
                year: 2026,
            });
        });

        it("should add completely new papers from DBLP", async () => {
            const existingPaper: Paper = {
                title: "Existing Paper Title",
                authors: [{ name: "Alice" }],
            };

            const dblpPaper: Paper = {
                title: "Brand New DBLP Paper",
                authors: [{ name: "Charlie" }],
                doi: "10.9999/8888",
                year: 2026,
            };

            mockSearchVenuePublications.mockResolvedValueOnce([dblpPaper]);

            const confWithPapers = { ...baseConference, acceptedPapers: [existingPaper] };
            const result = await enrichWithDblp(confWithPapers, "icse");

            expect(result.acceptedPapers?.length).toBe(2);

            // Output array should contain both papers
            const existingInResult = result.acceptedPapers?.find(p => p.title === "Existing Paper Title");
            const dblpInResult = result.acceptedPapers?.find(p => p.doi === "10.9999/8888");

            expect(existingInResult).toBeDefined();
            expect(dblpInResult).toBeDefined();
        });
    });

    describe("searchConferencePapers", () => {
        it("should call searchVenuePublications correctly", async () => {
            const mockPapers: Paper[] = [{ title: "Paper 1", authors: [] }];
            mockSearchVenuePublications.mockResolvedValueOnce(mockPapers);

            const result = await searchConferencePapers("icse", 2026, 50);

            expect(mockSearchVenuePublications).toHaveBeenCalledWith("icse", 2026, 50);
            expect(result).toEqual(mockPapers);
        });

        it("should handle optional arguments", async () => {
            const mockPapers: Paper[] = [{ title: "Paper 1", authors: [] }];
            mockSearchVenuePublications.mockResolvedValueOnce(mockPapers);

            const result = await searchConferencePapers("icse");

            expect(mockSearchVenuePublications).toHaveBeenCalledWith("icse", undefined, 100); // 100 is default maxResults
            expect(result).toEqual(mockPapers);
        });
    });
});
