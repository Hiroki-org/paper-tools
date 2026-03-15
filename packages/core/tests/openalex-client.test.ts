import { beforeEach, describe, expect, it, vi } from "vitest";
import * as rateLimiter from "../src/rate-limiter.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { getOpenAlexAuthor, resolveOpenAlexAuthorId } = await import("../src/openalex-client.js");

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
