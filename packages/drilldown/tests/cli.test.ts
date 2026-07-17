import { describe, it, expect, vi, beforeEach } from "vitest";
import { program } from "../src/cli.js";

vi.mock("../src/search.js", () => ({
    searchByKeyword: vi.fn(),
    searchByVenue: vi.fn(),
    enrichAllWithCrossref: vi.fn(),
    searchCrossref: vi.fn(),
}));

vi.mock("../src/drilldown.js", () => ({
    drilldown: vi.fn(),
    extractKeywords: vi.fn(),
}));

const { mockWriteFile } = vi.hoisted(() => {
    return {
        mockWriteFile: vi.fn(),
    };
});

vi.mock("node:fs/promises", () => ({
    writeFile: mockWriteFile,
}));

class ProcessExitError extends Error {
    constructor(public code: number) {
        super(`Process exited with code ${code}`);
        this.name = "ProcessExitError";
    }
}

describe("CLI", () => {
    let mockLog: any;
    let mockError: any;
    let mockExit: any;

    beforeEach(() => {
        mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
        mockError = vi.spyOn(console, "error").mockImplementation(() => {});
        mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
        mockWriteFile.mockReset();
        vi.resetAllMocks();
    });

    const runCli = async (...args: string[]) => {
        try {
            await program.exitOverride().parseAsync(["node", "cli.ts", ...args]);
        } catch (error) {
            if (error.code === "commander.processExit" || error.message === "process.exit(1)") {
                return; // Expected exit
            }
            throw error; // Rethrow actual unexpected errors
        }
    };

    it("should execute search command", async () => {
        const { searchByKeyword } = await import("../src/search.js");
        vi.mocked(searchByKeyword).mockResolvedValue([{ title: "Paper 1" } as any]);

        await runCli("search", "test-keyword");

        expect(searchByKeyword).toHaveBeenCalledWith("test-keyword", 30);
        expect(mockLog).toHaveBeenCalledWith(JSON.stringify([{ title: "Paper 1" }], null, 2));
    });

    it("should execute search command with --enrich and -o", async () => {
        const { searchByKeyword, enrichAllWithCrossref } = await import("../src/search.js");
        vi.mocked(searchByKeyword).mockResolvedValue([{ title: "Paper 1" } as any]);
        vi.mocked(enrichAllWithCrossref).mockResolvedValue([{ title: "Paper 1", doi: "10.1234/5678" } as any]);

        await runCli("search", "test-keyword", "--enrich", "-o", "out.json");

        expect(searchByKeyword).toHaveBeenCalledWith("test-keyword", 30);
        expect(enrichAllWithCrossref).toHaveBeenCalledWith([{ title: "Paper 1" }]);
        expect(mockWriteFile).toHaveBeenCalledWith("out.json", JSON.stringify([{ title: "Paper 1", doi: "10.1234/5678" }], null, 2), "utf-8");
        expect(mockError).toHaveBeenCalledWith("Output written to: out.json");
    });

    it("should execute venue command", async () => {
        const { searchByVenue } = await import("../src/search.js");
        vi.mocked(searchByVenue).mockResolvedValue([]);

        await runCli("venue", "ICSE", "--year", "2023");

        expect(searchByVenue).toHaveBeenCalledWith("ICSE", 2023, 100);
    });

    it("should execute venue command with --enrich", async () => {
        const { searchByVenue, enrichAllWithCrossref } = await import("../src/search.js");
        vi.mocked(searchByVenue).mockResolvedValue([{ title: "Paper 1" } as any]);
        vi.mocked(enrichAllWithCrossref).mockResolvedValue([{ title: "Paper 1", doi: "10.1234/5678" } as any]);

        await runCli("venue", "ICSE", "--enrich");

        expect(searchByVenue).toHaveBeenCalledWith("ICSE", undefined, 100);
        expect(enrichAllWithCrossref).toHaveBeenCalledWith([{ title: "Paper 1" }]);
    });

    it("should execute crossref command", async () => {
        const { searchCrossref } = await import("../src/search.js");
        vi.mocked(searchCrossref).mockResolvedValue([]);

        await runCli("crossref", "some query");

        expect(searchCrossref).toHaveBeenCalledWith("some query", 20);
    });

    it("should execute drilldown command", async () => {
        const { searchByKeyword } = await import("../src/search.js");
        const { drilldown } = await import("../src/drilldown.js");

        vi.mocked(searchByKeyword).mockResolvedValue([{ title: "Seed" } as any]);
        vi.mocked(drilldown).mockResolvedValue([]);

        await runCli("drilldown", "test-keyword");

        expect(searchByKeyword).toHaveBeenCalledWith("test-keyword", 10);
        expect(drilldown).toHaveBeenCalledWith([{ title: "Seed" }], 1, 10, false);
    });

    it("should exit when drilldown seed search returns 0", async () => {
        const { searchByKeyword } = await import("../src/search.js");
        vi.mocked(searchByKeyword).mockResolvedValue([]);

        await runCli("drilldown", "test-keyword");

        expect(mockError).toHaveBeenCalledWith("シード検索結果が 0 件です");
            });

    it("should execute keywords command", async () => {
        const { searchByKeyword } = await import("../src/search.js");
        const { extractKeywords } = await import("../src/drilldown.js");

        vi.mocked(searchByKeyword).mockResolvedValue([{ title: "P1" } as any]);
        vi.mocked(extractKeywords).mockReturnValue(["k1", "k2"]);

        await runCli("keywords", "test-keyword");

        expect(searchByKeyword).toHaveBeenCalledWith("test-keyword", 20);
        expect(extractKeywords).toHaveBeenCalledWith([{ title: "P1" }], 10);
        expect(mockLog).toHaveBeenCalledWith(JSON.stringify({
            query: "test-keyword",
            papersAnalyzed: 1,
            keywords: ["k1", "k2"]
        }, null, 2));
    });

    it("should exit when keywords search returns 0", async () => {
        const { searchByKeyword } = await import("../src/search.js");
        vi.mocked(searchByKeyword).mockResolvedValue([]);

        await runCli("keywords", "test-keyword");

        expect(mockError).toHaveBeenCalledWith("検索結果が 0 件です");
            });

    it("should handle error inside runAction", async () => {
        const { searchByKeyword } = await import("../src/search.js");
        vi.mocked(searchByKeyword).mockRejectedValue(new Error("Test Error Message"));

        await runCli("search", "test-keyword");

        expect(mockError).toHaveBeenCalledWith("Error:", "Test Error Message");
            });
});
