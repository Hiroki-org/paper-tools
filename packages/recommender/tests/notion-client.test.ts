import { beforeEach, describe, expect, it, vi } from "vitest";
import type { S2Paper } from "@paper-tools/core";

const mockClient = {
    users: {
        me: vi.fn(),
    },
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

    it("getDatabaseInfo should handle errors when fetching workspace name", async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockClient.users.me.mockRejectedValueOnce(new Error("API Error"));
        mockClient.databases.retrieve.mockResolvedValueOnce({
            title: [{ plain_text: " My Database " }]
        });

        const { getDatabaseInfo } = await import("../src/notion-client.js");
        const info = await getDatabaseInfo("db-1", mockClient as any);
        expect(info.databaseId).toBe("db-1");
        expect(info.workspaceName).toBe("Notion Workspace");
    });

    it("getDatabase should throw when properties have incorrect type", async () => {
        mockClient.databases.retrieve.mockResolvedValueOnce({
            properties: {
                "タイトル": { type: "number" },
            },
        });

        const { getDatabase } = await import("../src/notion-client.js");
        await expect(getDatabase("db-1", mockClient as any)).rejects.toThrow("Notion DBプロパティ型が不正です");
    });

    it("getDatabaseInfo should fetch workspace name", async () => {
        mockClient.users.me.mockResolvedValueOnce({
            name: " Test Workspace "
        });
        mockClient.databases.retrieve.mockResolvedValueOnce({
            title: [{ plain_text: " My Database " }]
        });

        const { getDatabaseInfo } = await import("../src/notion-client.js");
        const info = await getDatabaseInfo("db-1", mockClient as any);
        expect(info.databaseId).toBe("db-1");
        expect(info.databaseName).toBe("My Database");
        expect(info.workspaceName).toBe("Test Workspace");
    });

    it("readTitle and readRichText should return empty when property is missing or wrong type", async () => {
        mockClient.databases.query.mockResolvedValueOnce({
            results: [
                {
                    id: "page-empty",
                    properties: {
                        "タイトル": { type: "rich_text", rich_text: [{ plain_text: "wrong-type" }] },
                        "DOI": { type: "number", number: 123 },
                        "Semantic Scholar ID": undefined,
                    },
                },
            ],
            has_more: false,
            next_cursor: null,
        });

        const { findDuplicates } = await import("../src/notion-client.js");
        const result = await findDuplicates(
            "db-1",
            [],
            mockClient as any,
        );
        expect(result.duplicateTitles.size).toBe(0);
        expect(result.duplicateDois.size).toBe(0);
    });

    it("createPaperPage should fallback if validation is not provided", async () => {
        mockClient.databases.retrieve.mockResolvedValueOnce({
            properties: {
                "タイトル": { type: "title" },
                "DOI": { type: "rich_text" },
            },
        });
        mockClient.pages.create.mockResolvedValueOnce({ id: "new-page" });

        const paper = {
            paperId: "s2-2",
            title: "Fallback Paper",
        };

        const { createPaperPage } = await import("../src/notion-client.js");
        await createPaperPage("db-1", paper as any, mockClient as any);

        expect(mockClient.pages.create).toHaveBeenCalledTimes(1);
    });

    it("createPaperPage should handle missing title and externalIds gracefully", async () => {
        mockClient.databases.retrieve.mockResolvedValueOnce({
            properties: {
                "タイトル": { type: "title" },
                "DOI": { type: "rich_text" },
            },
        });
        mockClient.pages.create.mockResolvedValueOnce({ id: "new-page2" });

        const paper = {
            paperId: "s2-3",
        };

        const { createPaperPage } = await import("../src/notion-client.js");
        await createPaperPage("db-1", paper as any, mockClient as any);

        expect(mockClient.pages.create).toHaveBeenCalledTimes(1);
    });

    it("truncateRichTextContent should slice text to max length and append ellipsis", async () => {
        const { truncateRichTextContent } = await import("../src/notion-client.js");
        const longText = "A".repeat(2005);
        const truncated = truncateRichTextContent(longText, 2000);
        expect(truncated.length).toBe(2000);
        expect(truncated.endsWith("…")).toBe(true);

        const shortText = "Short";
        expect(truncateRichTextContent(shortText)).toBe("Short");
    });

    it("createNotionClient should throw if API key is not set", async () => {
        const originalEnv = process.env.NOTION_API_KEY;
        delete process.env.NOTION_API_KEY;

        const { createNotionClient } = await import("../src/notion-client.js");
        expect(() => createNotionClient()).toThrow("NOTION_API_KEY が未設定です");

        process.env.NOTION_API_KEY = originalEnv;
    });

    it("createNotionClient should return a valid Client when API key is set", async () => {
        const originalEnv = process.env.NOTION_API_KEY;
        process.env.NOTION_API_KEY = "valid-key";

        const { createNotionClient } = await import("../src/notion-client.js");
        const client = createNotionClient();
        expect(client).toBeDefined();

        process.env.NOTION_API_KEY = originalEnv;
    });
});
