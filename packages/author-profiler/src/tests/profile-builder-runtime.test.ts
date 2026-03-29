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

    it("returns cached profile if valid and forceRefresh is false", async () => {
        const cachedProfile = {
            id: "123",
            name: "Cached Alice",
            affiliations: [],
            hIndex: 10,
            citationCount: 100,
            paperCount: 5,
            influentialCitationCount: 4,
            topPapers: [],
            coauthors: [],
            topicTimeline: []
        };
        const cacheData = {
            "123": {
                updatedAt: new Date().toISOString(),
                profile: cachedProfile
            }
        };
        mockReadFile.mockResolvedValueOnce(JSON.stringify(cacheData));

        const result = await buildAuthorProfile("123");

        expect(result).toEqual(cachedProfile);
        expect(mockGetAuthor).not.toHaveBeenCalled();
    });

    it("bypasses cache and fetches data if forceRefresh is true", async () => {
        const cachedProfile = {
            id: "123",
            name: "Cached Alice",
            affiliations: [],
            hIndex: 10,
            citationCount: 100,
            paperCount: 5,
            influentialCitationCount: 4,
            topPapers: [],
            coauthors: [],
            topicTimeline: []
        };
        const cacheData = {
            "123": {
                updatedAt: new Date().toISOString(),
                profile: cachedProfile
            }
        };
        mockReadFile.mockResolvedValueOnce(JSON.stringify(cacheData));

        const result = await buildAuthorProfile("123", { forceRefresh: true });

        expect(result.name).toBe("Alice"); // From mockGetAuthor
        expect(mockGetAuthor).toHaveBeenCalledTimes(1);
    });

    it("enriches affiliations with OpenAlex data if available", async () => {
        mockResolveOpenAlexAuthorId.mockResolvedValueOnce("A123");
        mockGetOpenAlexAuthor.mockResolvedValueOnce({
            id: "A123",
            affiliations: [
                {
                    institution: { display_name: "OpenAlex U" },
                    years: [2021, 2022]
                },
                {
                    institution: { display_name: "Another U" },
                    years: [] // Should default to no year
                }
            ]
        });

        const result = await buildAuthorProfile("123");

        expect(result.affiliations).toContainEqual({ name: "Example U" }); // Base affiliation
        expect(result.affiliations).toContainEqual({ name: "OpenAlex U", year: 2021 });
        expect(result.affiliations).toContainEqual({ name: "OpenAlex U", year: 2022 });
        expect(result.affiliations).toContainEqual({ name: "Another U" });
    });

    it("gracefully handles OpenAlex errors without failing the main profile", async () => {
        mockResolveOpenAlexAuthorId.mockRejectedValueOnce(new Error("OpenAlex API Error"));

        const result = await buildAuthorProfile("123");

        expect(result.name).toBe("Alice");
        expect(result.affiliations).toEqual([{ name: "Example U" }]); // Only base affiliations
    });

    it("handles missing optional fields gracefully", async () => {
        mockGetAuthor.mockResolvedValueOnce({
            authorId: "999",
            name: "Bob",
            // Missing affiliations, hIndex, etc.
        });
        mockGetAuthorPapers.mockResolvedValueOnce({
            data: [] // No papers
        });

        const result = await buildAuthorProfile("999");

        expect(result.id).toBe("999");
        expect(result.name).toBe("Bob");
        expect(result.affiliations).toEqual([]);
        expect(result.hIndex).toBe(0);
        expect(result.citationCount).toBe(0);
        expect(result.paperCount).toBe(0);
        expect(result.influentialCitationCount).toBe(0);
        expect(result.topPapers).toEqual([]);
        expect(result.coauthors).toEqual([]);
        expect(result.topicTimeline).toEqual([]);
    });

});
