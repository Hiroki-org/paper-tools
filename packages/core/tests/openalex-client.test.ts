import { beforeEach, describe, expect, it, vi } from "vitest";
import * as rateLimiter from "../src/rate-limiter.js";
import {
    getOpenAlexAuthor,
    resolveOpenAlexAuthorId,
    scoreCandidate,
    type OpenAlexAuthor,
} from "../src/openalex-client.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("OpenAlex Client", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe("getOpenAlexAuthor", () => {
        it("fetches author and parses correctly", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    id: "https://openalex.org/A123",
                    display_name: "Alice",
                    works_count: 42,
                }),
            });

            const res = await getOpenAlexAuthor("A123");
            expect(res.id).toBe("https://openalex.org/A123");
            expect(res.display_name).toBe("Alice");
            expect(res.works_count).toBe(42);

            const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
            expect(url).toContain("https://api.openalex.org/authors/A123");
            expect(url).toContain("mailto=");
        });

        it("normalizes author ID from full URL", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    id: "https://openalex.org/A999",
                }),
            });

            await getOpenAlexAuthor("https://openalex.org/A999");
            const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
            expect(url).toContain("https://api.openalex.org/authors/A999");
        });

        it("normalizes author ID from lowercase", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    id: "https://openalex.org/A111",
                }),
            });

            await getOpenAlexAuthor("a111");
            const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
            expect(url).toContain("https://api.openalex.org/authors/A111");
        });

        it("throws an error with response text on API failure", async () => {
            const spy = vi.spyOn(rateLimiter, "fetchWithRetry").mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: "Not Found",
                text: async () => "Author not found",
            } as unknown as Response);

            await expect(getOpenAlexAuthor("A000")).rejects.toThrow("OpenAlex API error: 404 Not Found - Author not found");

            spy.mockRestore();
        });
    });

    describe("resolveOpenAlexAuthorId", () => {
        it("selects best match", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    results: [
                        { id: "https://openalex.org/A1", display_name: "Alice", works_count: 10 },
                        {
                            id: "https://openalex.org/A2",
                            display_name: "Alice Johnson",
                            works_count: 200,
                            last_known_institutions: [{ display_name: "Example University" }],
                        },
                    ],
                }),
            });

            const id = await resolveOpenAlexAuthorId({
                name: "Alice Johnson",
                affiliation: "Example University",
            });
            expect(id).toBe("https://openalex.org/A2");
        });

        it("returns null if query is empty", async () => {
            const id = await resolveOpenAlexAuthorId({ name: "   " });
            expect(id).toBeNull();
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("throws an error on API failure", async () => {
            const spy = vi.spyOn(rateLimiter, "fetchWithRetry").mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: "Internal Server Error",
                text: async () => "Something went wrong",
            } as unknown as Response);

            await expect(resolveOpenAlexAuthorId({ name: "Alice" })).rejects.toThrow("OpenAlex API error: 500 Internal Server Error - Something went wrong");

            spy.mockRestore();
        });
    });
});

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
        expect(score).toBe(55);
    });

    it("adds 15 points for an affiliation match in affiliations", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            affiliations: [{ institution: { display_name: "Tech Institute" } }],
        };
        const score = scoreCandidate(candidate, "Alice", "Tech");
        expect(score).toBe(55);
    });

    it("adds up to 15 points based on works_count", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            works_count: 750,
        };
        const score = scoreCandidate(candidate, "Alice");
        expect(score).toBe(55);
    });

    it("caps works_count points at 15", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            works_count: 5000,
        };
        const score = scoreCandidate(candidate, "Alice");
        expect(score).toBe(55);
    });

    it("handles partial works_count points", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
            works_count: 120,
        };
        const score = scoreCandidate(candidate, "Alice");
        expect(score).toBe(42);
    });

    it("combines multiple criteria for a total score", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice Smith",
            orcid: "0000-0000-0000-0001",
            last_known_institutions: [{ display_name: "Example University" }],
            works_count: 250,
        };
        const score = scoreCandidate(candidate, "Alice Smith", "Example Univ", "0000-0000-0000-0001");
        expect(score).toBe(160);
    });

    it("handles undefined parameters gracefully", () => {
        const candidate: OpenAlexAuthor = {
            id: "A123",
            display_name: "Alice",
        };
        const score = scoreCandidate(candidate);
        expect(score).toBe(0);
    });
});
