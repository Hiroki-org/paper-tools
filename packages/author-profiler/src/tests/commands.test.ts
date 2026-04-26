import { beforeEach, describe, expect, it, vi } from "vitest";
import { runProfileCommand } from "../commands/profile.js";
import { runPapersCommand } from "../commands/papers.js";
import { runCoauthorsCommand } from "../commands/coauthors.js";
import { runSaveCommand } from "../commands/save.js";
import { buildAuthorProfile } from "../services/profile-builder.js";
import { resolveAuthorId } from "../services/author-resolver.js";
import { aggregateCoauthorsFromPapers } from "../services/coauthor-network.js";
import { getAuthorPapers } from "@paper-tools/core";
import { saveAuthorProfileToNotion } from "../notion/author-client.js";

vi.mock("../services/profile-builder.js", () => ({
    buildAuthorProfile: vi.fn(),
}));

vi.mock("../services/author-resolver.js", () => ({
    resolveAuthorId: vi.fn(),
}));

vi.mock("../services/coauthor-network.js", () => ({
    aggregateCoauthorsFromPapers: vi.fn(),
}));

vi.mock("@paper-tools/core", () => ({
    getAuthorPapers: vi.fn(),
}));

vi.mock("../notion/author-client.js", () => ({
    saveAuthorProfileToNotion: vi.fn(),
}));

describe("author-profiler command handlers", () => {
    const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const mockTable = vi.spyOn(console, "table").mockImplementation(() => {});

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resolveAuthorId).mockResolvedValue({
            authorId: "123",
            name: "Alice",
        });
    });

    it("runProfileCommand prints JSON when --json is true", async () => {
        vi.mocked(buildAuthorProfile).mockResolvedValue({
            id: "123",
            name: "Alice",
            aliases: [],
            affiliations: [{ name: "Example U" }],
            homepage: "https://example.com",
            hIndex: 10,
            citationCount: 100,
            paperCount: 5,
            influentialCitationCount: 4,
            topPapers: [],
            coauthors: [],
            topicTimeline: [],
        });

        await runProfileCommand("Alice", { json: true });

        expect(resolveAuthorId).toHaveBeenCalledWith("Alice", { id: undefined });
        expect(buildAuthorProfile).toHaveBeenCalledWith("123");
        expect(mockLog).toHaveBeenCalledTimes(1);
        expect(mockTable).not.toHaveBeenCalled();
    });

    it("runProfileCommand prints table when --json is false", async () => {
        vi.mocked(buildAuthorProfile).mockResolvedValue({
            id: "123",
            name: "Alice",
            aliases: [],
            affiliations: [{ name: "Example U" }],
            homepage: undefined,
            hIndex: 10,
            citationCount: 100,
            paperCount: 5,
            influentialCitationCount: 4,
            topPapers: [],
            coauthors: [],
            topicTimeline: [],
        });

        await runProfileCommand("Alice", {});

        expect(mockLog).toHaveBeenCalled();
        expect(mockTable).toHaveBeenCalledTimes(1);
    });

    it("runPapersCommand validates --top and throws for invalid values", async () => {
        await expect(runPapersCommand("Alice", { top: "0" })).rejects.toThrow(
            "--top には正の整数を指定してください: 0",
        );
    });

    it("runPapersCommand renders top papers table", async () => {
        vi.mocked(buildAuthorProfile).mockResolvedValue({
            id: "123",
            name: "Alice",
            aliases: [],
            affiliations: [],
            homepage: undefined,
            hIndex: 10,
            citationCount: 100,
            paperCount: 5,
            influentialCitationCount: 4,
            topPapers: [
                {
                    title: "Paper A",
                    authors: [{ name: "Alice" }],
                    year: 2024,
                    venue: "ICSE",
                    citationCount: 10,
                },
                {
                    title: "Paper B",
                    authors: [{ name: "Alice" }],
                    year: 2023,
                    venue: "ASE",
                    citationCount: 8,
                },
            ],
            coauthors: [],
            topicTimeline: [],
        });

        await runPapersCommand("Alice", { top: "2" });

        expect(buildAuthorProfile).toHaveBeenCalledWith("123", { topPapers: 2 });
        expect(mockTable).toHaveBeenCalledTimes(1);
    });

    it("runCoauthorsCommand validates depth and throws when depth is not 1", async () => {
        await expect(runCoauthorsCommand("Alice", { depth: "2" })).rejects.toThrow(
            "現在 --depth は 1 のみ対応しています",
        );
    });

    it("runCoauthorsCommand renders coauthor network table", async () => {
        vi.mocked(getAuthorPapers).mockResolvedValue({
            data: [],
            total: 0,
            offset: 0,
            next: 0,
        });
        vi.mocked(aggregateCoauthorsFromPapers).mockReturnValue([
            { authorId: "a1", name: "Bob", paperCount: 3 },
            { authorId: "a2", name: "Carol", paperCount: 2 },
        ]);

        await runCoauthorsCommand("Alice", { depth: "1" });

        expect(getAuthorPapers).toHaveBeenCalledWith("123", {
            limit: 200,
            sort: "citationCount:desc",
        });
        expect(aggregateCoauthorsFromPapers).toHaveBeenCalledWith("123", []);
        expect(mockTable).toHaveBeenCalledTimes(1);
    });

    it("runSaveCommand prints dry-run payload for dry-run action", async () => {
        vi.mocked(buildAuthorProfile).mockResolvedValue({
            id: "123",
            name: "Alice",
            aliases: [],
            affiliations: [],
            homepage: undefined,
            hIndex: 10,
            citationCount: 100,
            paperCount: 5,
            influentialCitationCount: 4,
            topPapers: [],
            coauthors: [],
            topicTimeline: [],
        });
        vi.mocked(saveAuthorProfileToNotion).mockResolvedValue({ action: "dry-run" });

        await runSaveCommand("Alice", { dryRun: true });

        expect(saveAuthorProfileToNotion).toHaveBeenCalledWith(expect.any(Object), {
            dryRun: true,
        });
        expect(mockLog).toHaveBeenCalledTimes(1);
    });

    it("runSaveCommand prints persisted result for created/updated action", async () => {
        vi.mocked(buildAuthorProfile).mockResolvedValue({
            id: "123",
            name: "Alice",
            aliases: [],
            affiliations: [],
            homepage: undefined,
            hIndex: 10,
            citationCount: 100,
            paperCount: 5,
            influentialCitationCount: 4,
            topPapers: [],
            coauthors: [],
            topicTimeline: [],
        });
        vi.mocked(saveAuthorProfileToNotion).mockResolvedValue({
            action: "created",
            pageId: "page-1",
        });

        await runSaveCommand("Alice", {});

        expect(mockLog).toHaveBeenCalledTimes(1);
    });
});
