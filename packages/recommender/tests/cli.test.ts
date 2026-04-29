import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { syncPapers, outputJson, requireDatabaseId } from "../src/cli.js";
import { createPaperPage } from "../src/notion-client.js";

// Mock the notion-client and node:fs/promises
vi.mock("../src/notion-client.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual as any,
        createPaperPage: vi.fn(),
    };
});

vi.mock("node:fs/promises", () => ({
    writeFile: vi.fn(),
}));

describe("CLI module tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env["NOTION_DATABASE_ID"];
    });

    describe("requireDatabaseId", () => {
        it("should return database id when set", () => {
            process.env["NOTION_DATABASE_ID"] = "test-db-id";
            expect(requireDatabaseId()).toBe("test-db-id");
        });

        it("should throw error when database id is missing", () => {
            expect(() => requireDatabaseId()).toThrow("NOTION_DATABASE_ID が未設定です");
        });
    });

    describe("outputJson", () => {
        let consoleLogSpy: ReturnType<typeof vi.spyOn>;
        let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
            consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it("should output json to console when no output file is provided", async () => {
            const data = { foo: "bar" };
            await outputJson(data);

            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it("should write json to file when output file is provided", async () => {
            const data = { foo: "bar" };
            const outputFile = "out.json";

            const fsPromises = await import("node:fs/promises");

            await outputJson(data, outputFile);

            expect(fsPromises.writeFile).toHaveBeenCalledWith(outputFile, JSON.stringify(data, null, 2), "utf-8");
            expect(consoleErrorSpy).toHaveBeenCalledWith(`Output written to: ${outputFile}`);
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe("syncPapers", () => {
        let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        });

        afterEach(() => {
            consoleErrorSpy.mockRestore();
        });

        const mockValidation = { missingOptional: [] };

        it("should return correct counts when dryRun is true", async () => {
            const papers = [
                { paperId: "1", title: "Paper 1", externalIds: { DOI: "10.123/1" }, authors: [] },
                { paperId: "2", title: "Paper 2", externalIds: { DOI: "10.123/2" }, authors: [] },
            ];

            const duplicates = {
                duplicateDois: new Set<string>(),
                duplicateTitles: new Set<string>(),
            };

            const result = await syncPapers("db", papers as any, duplicates, true, mockValidation);

            expect(result).toEqual({ added: 2, skipped: 0, errors: 0 });
            expect(createPaperPage).not.toHaveBeenCalled();
        });

        it("should skip duplicate papers based on DOI and Title", async () => {
            const papers = [
                { paperId: "1", title: "Paper 1", externalIds: { DOI: "10.123/1" }, authors: [] }, // New
                { paperId: "2", title: "Paper 2", externalIds: { DOI: "10.123/dup" }, authors: [] }, // Duplicate DOI
                { paperId: "3", title: "duplicate title", externalIds: { DOI: "10.123/3" }, authors: [] }, // Duplicate Title
            ];

            const duplicates = {
                duplicateDois: new Set(["10.123/dup"]),
                duplicateTitles: new Set(["duplicate title"]),
            };

            const result = await syncPapers("db", papers as any, duplicates, true, mockValidation);

            expect(result).toEqual({ added: 1, skipped: 2, errors: 0 });
            expect(createPaperPage).not.toHaveBeenCalled();
        });

        it("should add papers and handle API errors during sync", async () => {
            const papers = [
                { paperId: "1", title: "Paper 1", externalIds: { DOI: "10.123/1" }, authors: [] }, // Success
                { paperId: "2", title: "Paper 2", externalIds: { DOI: "10.123/error" }, authors: [] }, // Error
                { paperId: "3", title: "Paper 3", externalIds: { DOI: "10.123/3" }, authors: [] }, // Success
            ];

            const duplicates = {
                duplicateDois: new Set<string>(),
                duplicateTitles: new Set<string>(),
            };

            vi.mocked(createPaperPage).mockImplementation(async (_, paper) => {
                if (paper.externalIds?.DOI === "10.123/error") {
                    throw new Error("API Error");
                }
                return { url: "test-url" } as any;
            });

            const result = await syncPapers("db", papers as any, duplicates, false, mockValidation);

            expect(result).toEqual({ added: 2, skipped: 0, errors: 1 });
            expect(createPaperPage).toHaveBeenCalledTimes(3);
            expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to add paper 10.123/error:", "API Error");
        });
    });
});
