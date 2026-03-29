import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();

const mockGetAuthor = vi.fn();
const mockGetAuthorPapers = vi.fn();
const mockResolveOpenAlexAuthorId = vi.fn();
const mockGetOpenAlexAuthor = vi.fn();

const mockAggregateCoauthorsFromPapers = vi.fn();

vi.mock("node:fs/promises", () => ({
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
}));

vi.mock("@paper-tools/core", () => ({
    getAuthor: mockGetAuthor,
    getAuthorPapers: mockGetAuthorPapers,
    resolveOpenAlexAuthorId: mockResolveOpenAlexAuthorId,
    getOpenAlexAuthor: mockGetOpenAlexAuthor,
}));

vi.mock("../services/coauthor-network.js", () => ({
    aggregateCoauthorsFromPapers: mockAggregateCoauthorsFromPapers,
}));

const { buildAuthorProfile } = await import("../services/profile-builder.js");

describe("buildAuthorProfile runtime behavior", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReadFile.mockRejectedValue(new Error("no cache"));
        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
        mockResolveOpenAlexAuthorId.mockResolvedValue(null);
        mockGetOpenAlexAuthor.mockResolvedValue({});
        mockAggregateCoauthorsFromPapers.mockReturnValue([]);
        mockGetAuthor.mockResolvedValue({
            authorId: "123",
            name: "Alice",
            affiliations: ["Example U"],
            hIndex: 10,
            citationCount: 100,
            paperCount: 5,
            influentialCitationCount: 4,
        });
        mockGetAuthorPapers.mockResolvedValue({
            data: [
                {
                    paperId: "p1",
                    title: "Paper",
                    citationCount: 12,
                    year: 2020,
                    authors: [{ authorId: "123", name: "Alice" }],
                    fieldsOfStudy: ["ML"],
                },
            ],
        });
    });

    it("uses fetched papers directly for coauthor aggregation", async () => {
        await buildAuthorProfile("123");

        expect(mockGetAuthorPapers).toHaveBeenCalledTimes(1);
        expect(mockAggregateCoauthorsFromPapers).toHaveBeenCalledTimes(1);
        expect(mockAggregateCoauthorsFromPapers).toHaveBeenCalledWith(
            "123",
            expect.arrayContaining([
                expect.objectContaining({ paperId: "p1" }),
            ]),
        );
    });

    it("deduplicates concurrent in-flight requests per authorId", async () => {
        let resolveAuthor: ((value: any) => void) | undefined;
        const delayedAuthor = new Promise((resolve) => {
            resolveAuthor = resolve;
        });

        mockGetAuthor.mockImplementationOnce(() => delayedAuthor);

        const first = buildAuthorProfile("123");
        const second = buildAuthorProfile("123");

        resolveAuthor?.({
            authorId: "123",
            name: "Alice",
            affiliations: ["Example U"],
            hIndex: 10,
            citationCount: 100,
            paperCount: 5,
            influentialCitationCount: 4,
        });

        await Promise.all([first, second]);

        expect(mockGetAuthor).toHaveBeenCalledTimes(1);
        expect(mockGetAuthorPapers).toHaveBeenCalledTimes(1);
    });
});
