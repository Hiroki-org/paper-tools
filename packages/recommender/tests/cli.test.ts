import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
const createPaperPageMock = vi.fn();

vi.mock("../src/notion-client.js", () => ({
    createPaperPage: (...args) => createPaperPageMock(...args)
}));

// We need to mock commander so the program doesn't try to parse argv
vi.mock("commander", () => ({
    Command: vi.fn().mockImplementation(() => ({
        name: vi.fn().mockReturnThis(),
        description: vi.fn().mockReturnThis(),
        version: vi.fn().mockReturnThis(),
        option: vi.fn().mockReturnThis(),
        action: vi.fn().mockReturnThis(),
        command: vi.fn().mockReturnThis(),
        argument: vi.fn().mockReturnThis(),
        parse: vi.fn(),
        parseAsync: vi.fn(),
    }))
}));

const originalExit = process.exit;

describe("cli syncPapers coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.exit = vi.fn() as any;
    });

    afterEach(() => {
        process.exit = originalExit;
    });

    it("should process papers concurrently using worker pool", async () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        vi.stubEnv("NOTION_DATABASE_ID", "mock-db");

        const { syncPapers } = await import("../src/cli.js");

        const papers = Array(10).fill(0).map((_, i) => ({
            title: `paper${i}`,
            externalIds: { DOI: `10/${i}` }
        }));
        const duplicates = { duplicateDois: new Set(), duplicateTitles: new Set() };

        createPaperPageMock.mockResolvedValue(true);

        const validation = { properties: {} } as any;
        const result = await syncPapers("db", papers, duplicates, false, validation);

        expect(result.added).toBe(10);
        expect(result.errors).toBe(0);
        expect(createPaperPageMock).toHaveBeenCalledTimes(10);

        // Test errors
        createPaperPageMock.mockRejectedValue(new Error("API Error"));
        const errResult = await syncPapers("db", [{ title: "error" }], duplicates, false, validation);
        expect(errResult.added).toBe(0);
        expect(errResult.errors).toBe(1);

        // Test dryRun
        const dryRunResult = await syncPapers("db", [{ title: "dry" }], duplicates, true, validation);
        expect(dryRunResult.added).toBe(1);
        expect(createPaperPageMock).toHaveBeenCalledTimes(11); // 10 from first, 1 error from second, 0 from dryRun

        // Test duplicates
        duplicates.duplicateDois.add("10/dup");
        const dupResult = await syncPapers("db", [{ title: "dup", externalIds: { DOI: "10/dup" } }], duplicates, false, validation);
        expect(dupResult.skipped).toBe(1);

        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        vi.unstubAllEnvs();
    });
});

    it("should output JSON", async () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { outputJson } = await import("../src/cli.js");

        await outputJson({ test: 1 });
        expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({ test: 1 }, null, 2));

        // Test with output file using mock fs
        const fsMock = { writeFile: vi.fn() };
        vi.doMock("node:fs/promises", () => fsMock);

        // dynamic import of node:fs/promises happens in outputJson, so we mock it
        vi.mock("node:fs/promises", () => ({ writeFile: vi.fn().mockResolvedValue(true) }));

        // Requires re-importing because vi.mock is hoisted, but since outputJson has dynamic import, it might work directly
        await outputJson({ test: 1 }, "out.json");

        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
