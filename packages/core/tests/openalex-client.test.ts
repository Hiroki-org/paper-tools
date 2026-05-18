import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getOpenAlexAuthor, resolveOpenAlexAuthorId } from "../src/openalex-client.js";

describe("OpenAlex Client", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe("resolveOpenAlexAuthorId", () => {
        it("returns null when name and orcid are empty", async () => {
            const result = await resolveOpenAlexAuthorId({ name: "   ", orcid: "" });
            expect(result).toBeNull();
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("throws error when API responds with not ok", async () => {
            for (let i = 0; i < 4; i++) {
                mockFetch.mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: "Internal Server Error",
                    text: async () => "Server crashed",
                });
            }

            await expect(resolveOpenAlexAuthorId({ name: "Alice" })).rejects.toThrow(
                "OpenAlex API error: 500 Internal Server Error - Server crashed"
            );
        }, 10000);

        it("uses exact orcid match to boost score", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        { id: "https://openalex.org/A1", display_name: "Alice", orcid: "0000-0000-0000-0001" },
                        { id: "https://openalex.org/A2", display_name: "Alice", orcid: "0000-0000-0000-0002" },
                    ],
                }),
            });

            const result = await resolveOpenAlexAuthorId({ name: "Alice", orcid: "0000-0000-0000-0002" });
            expect(result).toBe("https://openalex.org/A2");
        });

        it("ranks by exact name match and partial name match", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        { id: "https://openalex.org/A1", display_name: "Bob Builder" }, // partial match (includes Bob)
                        { id: "https://openalex.org/A2", display_name: "Bob" },         // exact match
                    ],
                }),
            });

            const result = await resolveOpenAlexAuthorId({ name: "Bob" });
            expect(result).toBe("https://openalex.org/A2");
        });

        it("ranks by affiliation matching with affiliations array", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        {
                            id: "https://openalex.org/A1",
                            display_name: "Charlie",
                            affiliations: [{ institution: { display_name: "MIT" } }]
                        },
                        {
                            id: "https://openalex.org/A2",
                            display_name: "Charlie",
                            affiliations: [{ institution: { display_name: "Stanford" } }]
                        },
                    ],
                }),
            });

            const result = await resolveOpenAlexAuthorId({ name: "Charlie", affiliation: "Stanford" });
            expect(result).toBe("https://openalex.org/A2");
        });

        it("ranks by affiliation matching with last_known_institutions array", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        {
                            id: "https://openalex.org/A1",
                            display_name: "Charlie",
                            last_known_institutions: [{ display_name: "MIT" }]
                        },
                        {
                            id: "https://openalex.org/A2",
                            display_name: "Charlie",
                            last_known_institutions: [{ display_name: "Harvard" }]
                        },
                    ],
                }),
            });

            const result = await resolveOpenAlexAuthorId({ name: "Charlie", affiliation: "Harvard" });
            expect(result).toBe("https://openalex.org/A2");
        });

        it("ranks by works_count", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        { id: "https://openalex.org/A1", display_name: "Dave", works_count: 50 }, // score += 1
                        { id: "https://openalex.org/A2", display_name: "Dave", works_count: 500 }, // score += 10
                    ],
                }),
            });

            const result = await resolveOpenAlexAuthorId({ name: "Dave" });
            expect(result).toBe("https://openalex.org/A2");
        });

        it("returns null when no results are found", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [],
                }),
            });

            const result = await resolveOpenAlexAuthorId({ name: "Unknown Author" });
            expect(result).toBeNull();
        });

        it("handles missing results field gracefully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            const result = await resolveOpenAlexAuthorId({ name: "Unknown Author" });
            expect(result).toBeNull();
        });
    });
});
