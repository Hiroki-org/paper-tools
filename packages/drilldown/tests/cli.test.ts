import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

const mockWriteFile = vi.fn();
vi.mock("node:fs/promises", () => ({
    writeFile: mockWriteFile,
}));

describe("CLI", () => {
    let originalArgv: string[];
    let mockLog: any;
    let mockError: any;
    let mockExit: any;

    beforeEach(() => {
        vi.resetModules();
        originalArgv = process.argv;
        mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
        mockError = vi.spyOn(console, "error").mockImplementation(() => {});
        mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
        mockWriteFile.mockReset();
    });

    afterEach(() => {
        process.argv = originalArgv;
        vi.restoreAllMocks();
    });

    it("should execute search command", async () => {
        process.argv = ["node", "cli.ts", "search", "test-keyword"];
        const { searchByKeyword } = await import("../src/search.js");
        vi.mocked(searchByKeyword).mockResolvedValue([{ title: "Paper 1" } as any]);

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(searchByKeyword).toHaveBeenCalledWith("test-keyword", 30);
        expect(mockLog).toHaveBeenCalledWith(JSON.stringify([{ title: "Paper 1" }], null, 2));
    });

    it("should execute search command with --enrich and -o", async () => {
        process.argv = ["node", "cli.ts", "search", "test-keyword", "--enrich", "-o", "out.json"];
        const { searchByKeyword, enrichAllWithCrossref } = await import("../src/search.js");
        vi.mocked(searchByKeyword).mockResolvedValue([{ title: "Paper 1" } as any]);
        vi.mocked(enrichAllWithCrossref).mockResolvedValue([{ title: "Paper 1", doi: "10.1234/5678" } as any]);

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(searchByKeyword).toHaveBeenCalledWith("test-keyword", 30);
        expect(enrichAllWithCrossref).toHaveBeenCalledWith([{ title: "Paper 1" }]);
        expect(mockWriteFile).toHaveBeenCalledWith("out.json", JSON.stringify([{ title: "Paper 1", doi: "10.1234/5678" }], null, 2), "utf-8");
        expect(mockError).toHaveBeenCalledWith("Output written to: out.json");
    });

    it("should execute venue command", async () => {
        process.argv = ["node", "cli.ts", "venue", "ICSE", "--year", "2023"];
        const { searchByVenue } = await import("../src/search.js");
        vi.mocked(searchByVenue).mockResolvedValue([]);

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(searchByVenue).toHaveBeenCalledWith("ICSE", 2023, 100);
    });

    it("should execute venue command with --enrich", async () => {
        process.argv = ["node", "cli.ts", "venue", "ICSE", "--enrich"];
        const { searchByVenue, enrichAllWithCrossref } = await import("../src/search.js");
        vi.mocked(searchByVenue).mockResolvedValue([{ title: "Paper 1" } as any]);
        vi.mocked(enrichAllWithCrossref).mockResolvedValue([{ title: "Paper 1", doi: "10.1234/5678" } as any]);

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(searchByVenue).toHaveBeenCalledWith("ICSE", undefined, 100);
        expect(enrichAllWithCrossref).toHaveBeenCalledWith([{ title: "Paper 1" }]);
    });

    it("should execute crossref command", async () => {
        process.argv = ["node", "cli.ts", "crossref", "some query"];
        const { searchCrossref } = await import("../src/search.js");
        vi.mocked(searchCrossref).mockResolvedValue([]);

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(searchCrossref).toHaveBeenCalledWith("some query", 20);
    });

    it("should execute drilldown command", async () => {
        process.argv = ["node", "cli.ts", "drilldown", "test-keyword"];
        const { searchByKeyword } = await import("../src/search.js");
        const { drilldown } = await import("../src/drilldown.js");

        vi.mocked(searchByKeyword).mockResolvedValue([{ title: "Seed" } as any]);
        vi.mocked(drilldown).mockResolvedValue([]);

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(searchByKeyword).toHaveBeenCalledWith("test-keyword", 10);
        expect(drilldown).toHaveBeenCalledWith([{ title: "Seed" }], 1, 10, false);
    });

    it("should exit when drilldown seed search returns 0", async () => {
        process.argv = ["node", "cli.ts", "drilldown", "test-keyword"];
        const { searchByKeyword } = await import("../src/search.js");

        vi.mocked(searchByKeyword).mockResolvedValue([]);

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(mockError).toHaveBeenCalledWith("シード検索結果が 0 件です");
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should execute keywords command", async () => {
        process.argv = ["node", "cli.ts", "keywords", "test-keyword"];
        const { searchByKeyword } = await import("../src/search.js");
        const { extractKeywords } = await import("../src/drilldown.js");

        vi.mocked(searchByKeyword).mockResolvedValue([{ title: "P1" } as any]);
        vi.mocked(extractKeywords).mockReturnValue(["k1", "k2"]);

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(searchByKeyword).toHaveBeenCalledWith("test-keyword", 20);
        expect(extractKeywords).toHaveBeenCalledWith([{ title: "P1" }], 10);
        expect(mockLog).toHaveBeenCalledWith(JSON.stringify({
            query: "test-keyword",
            papersAnalyzed: 1,
            keywords: ["k1", "k2"]
        }, null, 2));
    });

    it("should exit when keywords search returns 0", async () => {
        process.argv = ["node", "cli.ts", "keywords", "test-keyword"];
        const { searchByKeyword } = await import("../src/search.js");

        vi.mocked(searchByKeyword).mockResolvedValue([]);

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(mockError).toHaveBeenCalledWith("検索結果が 0 件です");
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle error inside runAction", async () => {
        process.argv = ["node", "cli.ts", "search", "test-keyword"];
        const { searchByKeyword } = await import("../src/search.js");
        vi.mocked(searchByKeyword).mockRejectedValue(new Error("Test Error Message"));

        await import("../src/cli.js");
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for runAction

        expect(mockError).toHaveBeenCalledWith("Error:", "Test Error Message");
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});
