import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { looksLikeAuthorId, resolveAuthorId } from "../services/author-resolver.js";
import { getAuthor, searchAuthors } from "@paper-tools/core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import prompts from "prompts";
import { join } from "node:path";
import { homedir } from "node:os";

// Mock external dependencies
vi.mock("@paper-tools/core", () => ({
    getAuthor: vi.fn(),
    searchAuthors: vi.fn()
}));

vi.mock("node:fs/promises", () => ({
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn()
}));

vi.mock("prompts", () => ({
    default: vi.fn()
}));

const CACHE_DIR = join(homedir(), ".paper-tools", "author-profiler");
const CACHE_FILE = join(CACHE_DIR, "resolver-cache.json");

describe("author-resolver", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // By default, make readFile throw so readCache returns {}
        vi.mocked(readFile).mockRejectedValue(new Error("File not found"));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("looksLikeAuthorId", () => {
        it("should return true for numeric strings", () => {
            expect(looksLikeAuthorId("123456")).toBe(true);
            expect(looksLikeAuthorId("  123  ")).toBe(true);
            expect(looksLikeAuthorId("0")).toBe(true);
        });

        it("should return false for non-numeric strings", () => {
            expect(looksLikeAuthorId("")).toBe(false);
            expect(looksLikeAuthorId("John Doe")).toBe(false);
            expect(looksLikeAuthorId("123a")).toBe(false);
            expect(looksLikeAuthorId("a123")).toBe(false);
        });
    });

    describe("resolveAuthorId - basic validation and cache", () => {
        it("should throw error if query is empty", async () => {
            await expect(resolveAuthorId("")).rejects.toThrow("著者名またはAuthor IDを指定してください");
            await expect(resolveAuthorId("   ")).rejects.toThrow("著者名またはAuthor IDを指定してください");
        });

        it("should return cached result if available", async () => {
            const cachedAuthor = { authorId: "123", name: "Cached Author" };
            const cacheData = { "john doe": cachedAuthor };

            vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(cacheData));

            const result = await resolveAuthorId("John Doe");

            expect(result).toEqual(cachedAuthor);
            expect(readFile).toHaveBeenCalledWith(CACHE_FILE, "utf-8");
            expect(getAuthor).not.toHaveBeenCalled();
            expect(searchAuthors).not.toHaveBeenCalled();
        });
    });
    describe("resolveAuthorId - explicit ID resolution", () => {
        it("should call getAuthor if options.id is true", async () => {
            const mockAuthor = { authorId: "id123", name: "Resolved Author" };
            vi.mocked(getAuthor).mockResolvedValueOnce(mockAuthor as any);

            const result = await resolveAuthorId("id123", { id: true });

            expect(result).toEqual({ authorId: "id123", name: "Resolved Author" });
            expect(getAuthor).toHaveBeenCalledWith("id123", ["authorId", "name"]);
            expect(writeFile).toHaveBeenCalled(); // Cache is updated
        });

        it("should call getAuthor if input looks like author ID", async () => {
            const mockAuthor = { authorId: "12345", name: "Numeric Author" };
            vi.mocked(getAuthor).mockResolvedValueOnce(mockAuthor as any);

            const result = await resolveAuthorId("12345");

            expect(result).toEqual({ authorId: "12345", name: "Numeric Author" });
            expect(getAuthor).toHaveBeenCalledWith("12345", ["authorId", "name"]);
            expect(writeFile).toHaveBeenCalled();
        });

        it("should throw if getAuthor does not return authorId", async () => {
            vi.mocked(getAuthor).mockResolvedValueOnce({} as any); // Missing authorId

            await expect(resolveAuthorId("12345")).rejects.toThrow("Author not found: 12345");
        });
    });

    describe("resolveAuthorId - single candidate search", () => {
        it("should resolve single candidate automatically and skip prompt", async () => {
            const mockResponse = {
                data: [{ authorId: "id1", name: "Single Author" }]
            };
            vi.mocked(searchAuthors).mockResolvedValueOnce(mockResponse as any);

            const result = await resolveAuthorId("Single Author Query");

            expect(result).toEqual({ authorId: "id1", name: "Single Author" });
            expect(searchAuthors).toHaveBeenCalledWith("Single Author Query", { limit: 10 });
            expect(prompts).not.toHaveBeenCalled();
            expect(writeFile).toHaveBeenCalled();
        });

        it("should throw error if single candidate lacks authorId", async () => {
            const mockResponse = {
                data: [{ name: "Single Author No ID" }]
            };
            vi.mocked(searchAuthors).mockResolvedValueOnce(mockResponse as any);

            await expect(resolveAuthorId("Single Author Query")).rejects.toThrow("著者IDが取得できませんでした");
        });
    });
    describe("resolveAuthorId - multiple candidates search", () => {
        const mockCandidates = [
            { authorId: "id1", name: "John Doe 1", hIndex: 10, paperCount: 50, affiliations: ["Univ A"] },
            { authorId: "id2", name: "John Doe 2", hIndex: 5, paperCount: 20, affiliations: ["Univ B"] }
        ];

        it("should throw error if search returns no candidates", async () => {
            vi.mocked(searchAuthors).mockResolvedValueOnce({ data: [] } as any);

            await expect(resolveAuthorId("Ghost Author")).rejects.toThrow("著者が見つかりませんでした: Ghost Author");
        });

        it("should return the first candidate if interactive is false", async () => {
            vi.mocked(searchAuthors).mockResolvedValueOnce({ data: mockCandidates } as any);

            const result = await resolveAuthorId("John Doe", { interactive: false });

            expect(result).toEqual({ authorId: "id1", name: "John Doe 1" });
            expect(prompts).not.toHaveBeenCalled();
            expect(writeFile).toHaveBeenCalled();
        });

        it("should prompt user and return selected candidate if interactive is true", async () => {
            vi.mocked(searchAuthors).mockResolvedValueOnce({ data: mockCandidates } as any);
            vi.mocked(prompts).mockResolvedValueOnce({ authorId: "id2" });

            const result = await resolveAuthorId("John Doe", { interactive: true });

            expect(result).toEqual({ authorId: "id2", name: "John Doe 2" });
            expect(prompts).toHaveBeenCalled();
            expect(writeFile).toHaveBeenCalled();
        });

        it("should prompt user by default and return selected candidate", async () => {
            vi.mocked(searchAuthors).mockResolvedValueOnce({ data: mockCandidates } as any);
            vi.mocked(prompts).mockResolvedValueOnce({ authorId: "id2" });

            const result = await resolveAuthorId("John Doe");

            expect(result).toEqual({ authorId: "id2", name: "John Doe 2" });
            expect(prompts).toHaveBeenCalled();
        });

        it("should throw error if user cancels the prompt", async () => {
            vi.mocked(searchAuthors).mockResolvedValueOnce({ data: mockCandidates } as any);
            vi.mocked(prompts).mockResolvedValueOnce({}); // User canceled

            await expect(resolveAuthorId("John Doe")).rejects.toThrow("著者選択がキャンセルされました");
        });

        it("should throw error if selected candidate lacks authorId", async () => {
            const badCandidates = [
                { authorId: "id1", name: "John Doe 1" },
                { name: "John Doe No ID" }
            ];
            vi.mocked(searchAuthors).mockResolvedValueOnce({ data: badCandidates } as any);
            vi.mocked(prompts).mockResolvedValueOnce({ authorId: "missing" });

            // If prompts returns an ID not in the list, it defaults to the first candidate.
            // But if it returns an ID that IS in the list but somehow missing later...
            // Let's test the specific block: if selected doesn't have authorId
            vi.mocked(prompts).mockResolvedValueOnce({ authorId: "missing_but_found" });
            // Let's mock finding it but with empty id

            // Re-mock to match exact branch flow for the throw:
            const singleBad = [{ name: "Bad" }];
            vi.mocked(searchAuthors).mockReset();
            vi.mocked(searchAuthors).mockResolvedValueOnce({ data: singleBad } as any);
            vi.mocked(prompts).mockResolvedValueOnce({ authorId: "id_that_points_to_bad" });

            // Wait, searchAuthors needs multiple to reach the prompt
            const multipleBad = [{ name: "Bad 1" }, { name: "Bad 2" }];
            vi.mocked(searchAuthors).mockReset();
            vi.mocked(searchAuthors).mockResolvedValueOnce({ data: multipleBad } as any);
            vi.mocked(prompts).mockResolvedValueOnce({ authorId: "some_id" });

            await expect(resolveAuthorId("John Doe")).rejects.toThrow("著者IDが取得できませんでした");
        });
    });
});
