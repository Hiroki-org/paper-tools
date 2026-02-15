import { beforeEach, describe, expect, it, vi } from "vitest";
import type { S2Paper } from "@paper-tools/core";

const mockClient = {
    databases: {
        retrieve: vi.fn(),
        query: vi.fn(),
    },
    pages: {
        create: vi.fn(),
    },
};

const {
    getDatabase,
    createPaperPage,
    findDuplicates,
} = await import("../src/notion-client.js");

describe("notion-client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("createPaperPage should map properties correctly", async () => {
        mockClient.databases.retrieve.mockResolvedValueOnce({
            properties: {
                "タイトル": { type: "title" },
                "DOI": { type: "rich_text" },
                "著者": { type: "rich_text" },
                "年": { type: "number" },
                "会議/ジャーナル": { type: "rich_text" },
                "被引用数": { type: "number" },
                "分野": { type: "multi_select" },
                "ソース": { type: "select" },
                "Open Access PDF": { type: "url" },
                "Semantic Scholar ID": { type: "rich_text" },
                "要約": { type: "rich_text" },
            },
        });
        mockClient.pages.create.mockResolvedValueOnce({ id: "new-page" });

        const paper: S2Paper = {
            paperId: "s2-1",
            title: "Test Paper",
            year: 2024,
            authors: [{ name: "Alice" }, { name: "Bob" }],
            venue: "ICSE",
            citationCount: 10,
            fieldsOfStudy: ["Computer Science"],
            openAccessPdf: { url: "https://example.com/paper.pdf" },
            externalIds: { DOI: "10.1000/xyz" },
            abstract: "summary",
        };

        const validation = await getDatabase("db-1", mockClient as any);
        await createPaperPage("db-1", paper, mockClient as any, validation);

        expect(mockClient.pages.create).toHaveBeenCalledTimes(1);
        const call = mockClient.pages.create.mock.calls[0]?.[0];
        expect(call.properties["タイトル"].title[0].text.content).toBe("Test Paper");
        expect(call.properties["DOI"].rich_text[0].text.content).toBe("10.1000/xyz");
        expect(call.properties["著者"].rich_text[0].text.content).toBe("Alice, Bob");
        expect(call.properties["ソース"].select.name).toBe("recommendation");
    });

    it("findDuplicates should detect DOI duplicates", async () => {
        mockClient.databases.query
            .mockResolvedValueOnce({
                results: [
                    {
                        id: "page-1",
                        properties: {
                            "タイトル": { type: "title", title: [{ plain_text: "Existing" }] },
                            "DOI": { type: "rich_text", rich_text: [{ plain_text: "10.1000/existing" }] },
                            "Semantic Scholar ID": { type: "rich_text", rich_text: [] },
                        },
                    },
                ],
                has_more: false,
                next_cursor: null,
            });

        const result = await findDuplicates(
            "db-1",
            [
                { paperId: "a", title: "New", externalIds: { DOI: "10.1000/existing" } },
                { paperId: "b", title: "Existing" },
            ],
            mockClient as any,
        );

        expect(result.duplicateDois.has("10.1000/existing")).toBe(true);
        expect(result.duplicateTitles.has("existing")).toBe(true);
        expect(mockClient.databases.query).toHaveBeenCalledTimes(1);
    });

    it("getDatabase should throw when required properties are missing", async () => {
        mockClient.databases.retrieve.mockResolvedValueOnce({
            properties: {
                "タイトル": { type: "title" },
            },
        });

        await expect(getDatabase("db-1", mockClient as any)).rejects.toThrow("必須プロパティが不足");
    });
});