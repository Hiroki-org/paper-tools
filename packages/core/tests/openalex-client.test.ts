import { describe, expect, it } from "vitest";
import { scoreCandidate, OpenAlexAuthor } from "../src/openalex-client.js";

describe("scoreCandidate", () => {
    it("returns 0 for non-matching empty candidate", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
        };
        const score = scoreCandidate(candidate, "Bob", "Some University", "0000-0000-0000-0000");
        expect(score).toBe(0);
    });

    it("adds 100 points for an exact ORCID match", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            orcid: "https://orcid.org/0000-0001-2345-6789",
        };
        const score = scoreCandidate(candidate, "Bob", "", "https://orcid.org/0000-0001-2345-6789");
        expect(score).toBe(100);
    });

    it("handles case-insensitive ORCID matching", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            orcid: "https://orcid.org/0000-0001-2345-6789",
        };
        const score = scoreCandidate(candidate, "Bob", "", "HTTPS://ORCID.ORG/0000-0001-2345-6789");
        expect(score).toBe(100);
    });

    it("adds 40 points for an exact name match", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice Smith",
        };
        const score = scoreCandidate(candidate, "Alice Smith");
        expect(score).toBe(40);
    });

    it("adds 20 points for a partial name match", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice Smith Johnson",
        };
        const score = scoreCandidate(candidate, "Alice Smith");
        expect(score).toBe(20);
    });

    it("adds 15 points for an affiliation match in last_known_institutions", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            last_known_institutions: [{ display_name: "Example University" }],
        };
        const score = scoreCandidate(candidate, "Alice", "Example");
        // 40 for name match + 15 for affiliation = 55
        expect(score).toBe(55);
    });

    it("adds 15 points for an affiliation match in affiliations", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            affiliations: [{ institution: { display_name: "Tech Institute" } }],
        };
        const score = scoreCandidate(candidate, "Alice", "Tech");
        // 40 for name match + 15 for affiliation = 55
        expect(score).toBe(55);
    });

    it("adds up to 15 points based on works_count", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            works_count: 750, // 750 / 50 = 15
        };
        const score = scoreCandidate(candidate, "Alice");
        // 40 for name match + 15 for works_count = 55
        expect(score).toBe(55);
    });

    it("caps works_count points at 15", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            works_count: 5000, // 5000 / 50 = 100
        };
        const score = scoreCandidate(candidate, "Alice");
        // 40 for name match + 15 (max) for works_count = 55
        expect(score).toBe(55);
    });

    it("handles partial works_count points", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            works_count: 120, // Math.floor(120 / 50) = 2
        };
        const score = scoreCandidate(candidate, "Alice");
        // 40 for name match + 2 for works_count = 42
        expect(score).toBe(42);
    });

    it("combines multiple criteria for a total score", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice Smith",
            orcid: "0000-0000-0000-0001",
            last_known_institutions: [{ display_name: "Example University" }],
            works_count: 250, // 5 points
        };
        const score = scoreCandidate(candidate, "Alice Smith", "Example Univ", "0000-0000-0000-0001");
        // 100 (orcid) + 40 (exact name) + 15 (affiliation) + 5 (works) = 160
        expect(score).toBe(160);
    });

    it("handles undefined parameters gracefully", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
        };
        const score = scoreCandidate(candidate);
        // Returns 0 since works_count is undefined (0/50 = 0) and no target fields were passed
        expect(score).toBe(0);
    });
});
