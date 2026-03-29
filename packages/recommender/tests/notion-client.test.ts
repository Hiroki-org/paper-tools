import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
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

describe("notion-client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("createPaperPage should map properties correctly", async () => {
        const { getDatabase, createPaperPage } = await import("../src/notion-client.js");
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
        const { findDuplicates } = await import("../src/notion-client.js");
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
        const { getDatabase } = await import("../src/notion-client.js");
        mockClient.databases.retrieve.mockResolvedValueOnce({
            properties: {
                "タイトル": { type: "title" },
            },
        });

        await expect(getDatabase("db-1", mockClient as any)).rejects.toThrow("必須プロパティが不足");
    });

    it("createNotionClient should throw if API key is not set", async () => {
        vi.stubEnv('NOTION_API_KEY', '');
        const { getDatabaseInfo } = await import("../src/notion-client.js");
        await expect(getDatabaseInfo("db-1", undefined)).rejects.toThrow("NOTION_API_KEY が未設定です");
    });

    it("createNotionClient should return a valid Client when API key is set", async () => {
        vi.stubEnv('NOTION_API_KEY', 'valid-key');

        vi.mock('@notionhq/client', () => ({ Client: function(){ return { databases: { retrieve: vi.fn().mockRejectedValue(new Error("network failure")) } } } }));

        const { getDatabaseInfo } = await import("../src/notion-client.js");

        try {
            await getDatabaseInfo("db-1", undefined);
        } catch(e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            expect(msg).not.toBe("NOTION_API_KEY が未設定です");
        }
    });

    it("truncateRichTextContent should slice text to max length and append ellipsis via createPaperPage", async () => {
        mockClient.databases.retrieve.mockResolvedValueOnce({
            properties: {
                "タイトル": { type: "title" },
                "DOI": { type: "rich_text" },
                "要約": { type: "rich_text" },
            },
        });
        mockClient.pages.create.mockResolvedValueOnce({ id: "new-page" });

        const paper = {
            paperId: "s2-trunc",
            abstract: "A".repeat(2005),
            title: "Trun",
            externalIds: { DOI: "10.0" }
        } as any;

        const { createPaperPage } = await import("../src/notion-client.js");

        // Pass a mock validation directly to bypass retrieve mock overlap
        await createPaperPage("db-1", paper, mockClient as any, {
            properties: {
                "タイトル": { type: "title" },
                "DOI": { type: "rich_text" },
                "要約": { type: "rich_text" }
            },
            missingOptional: []
        });

        expect(mockClient.pages.create).toHaveBeenCalledTimes(1);
        const call = mockClient.pages.create.mock.calls.at(-1)[0];
        const truncated = call.properties["要約"].rich_text[0].text.content;
        expect(truncated.length).toBe(2000);
        expect(truncated.endsWith("…")).toBe(true);
    });

    it("getDatabaseInfo should handle errors when fetching workspace name", async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const mockErrorClient = {
            databases: {
                retrieve: vi.fn().mockResolvedValueOnce({
                    title: [{ plain_text: " My Database " }]
                })
            },
            users: {
                me: vi.fn().mockRejectedValueOnce(new Error("API Error"))
            }
        };

        const { getDatabaseInfo } = await import("../src/notion-client.js");
        const info = await getDatabaseInfo("db-1", mockErrorClient as any);
        expect(info.databaseId).toBe("db-1");
        expect(info.workspaceName).toBe("Notion Workspace");
    });

    it("getDatabase should throw when properties have incorrect type", async () => {
        const typeMockClient = {
            databases: {
                retrieve: vi.fn().mockResolvedValueOnce({
                    properties: {
                        "タイトル": { type: "number" },
                        "DOI": { type: "rich_text" }
                    },
                })
            }
        };

        const { getDatabase } = await import("../src/notion-client.js");
        await expect(getDatabase("db-1", typeMockClient as any)).rejects.toThrow("Notion DBプロパティ型が不正です: タイトル expected=title actual=number");
    });

    it("getDatabaseInfo should fetch workspace name", async () => {
        const mockNameClient = {
            databases: {
                retrieve: vi.fn().mockResolvedValueOnce({
                    title: [{ plain_text: " My Database " }]
                })
            },
            users: {
                me: vi.fn().mockResolvedValueOnce({
                    name: " Test Workspace "
                })
            }
        };

        const { getDatabaseInfo } = await import("../src/notion-client.js");
        const info = await getDatabaseInfo("db-1", mockNameClient as any);
        expect(info.databaseId).toBe("db-1");
        expect(info.databaseName).toBe("My Database");
        expect(info.workspaceName).toBe("Test Workspace");
    });

    it("readTitle and readRichText should return empty when property is missing or wrong type", async () => {
        const emptyMockClient = {
            databases: {
                query: vi.fn().mockResolvedValueOnce({
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
                })
            }
        };

        const { findDuplicates } = await import("../src/notion-client.js");
        const result = await findDuplicates(
            "db-1",
            [],
            emptyMockClient as any,
        );
        expect(result.duplicateTitles.size).toBe(0);
        expect(result.duplicateDois.size).toBe(0);
    });

    it("createPaperPage should fallback if validation is not provided", async () => {
        const fbMockClient = {
            databases: {
                retrieve: vi.fn().mockResolvedValueOnce({
                    properties: {
                        "タイトル": { type: "title" },
                        "DOI": { type: "rich_text" },
                    },
                })
            },
            pages: {
                create: vi.fn().mockResolvedValueOnce({ id: "new-page" })
            }
        };

        const paper = {
            paperId: "s2-2",
            title: "Fallback Paper",
            externalIds: { DOI: "10.0" }
        };

        const { createPaperPage } = await import("../src/notion-client.js");
        await createPaperPage("db-1", paper as any, fbMockClient as any);

        expect(fbMockClient.pages.create).toHaveBeenCalledTimes(1);
    });

    it("createPaperPage should handle missing title and externalIds gracefully", async () => {
        const msMockClient = {
            databases: {
                retrieve: vi.fn().mockResolvedValueOnce({
                    properties: {
                        "タイトル": { type: "title" },
                        "DOI": { type: "rich_text" },
                    },
                })
            },
            pages: {
                create: vi.fn().mockResolvedValueOnce({ id: "new-page2" })
            }
        };

        const paper = {
            paperId: "s2-3",
            title: "",
            externalIds: { DOI: "" }
        };

        const { createPaperPage } = await import("../src/notion-client.js");
        await createPaperPage("db-1", paper as any, msMockClient as any, {
            properties: {
                "タイトル": { type: "title" },
                "DOI": { type: "rich_text" },
            },
            missingOptional: []
        });

        expect(msMockClient.pages.create).toHaveBeenCalledTimes(1);
    });

    it("queryPapers should handle missing title and plain_text properties gracefully", async () => {
        const qMockClient = {
            databases: {
                query: vi.fn().mockResolvedValueOnce({
                    results: [
                        {
                            id: "page-empty-text",
                            properties: {
                                "タイトル": { type: "title", title: undefined },
                                "DOI": { type: "rich_text", rich_text: [{ plain_text: undefined }] },
                                "Semantic Scholar ID": { type: "rich_text", rich_text: undefined },
                            },
                        },
                    ],
                    has_more: true,
                    next_cursor: "cursor-1",
                }).mockResolvedValueOnce({
                    results: [
                        {
                            id: "page-empty-title",
                            properties: {
                                "タイトル": { type: "title", title: [{ plain_text: undefined }] },
                            },
                        },
                    ],
                    has_more: false,
                    next_cursor: null,
                })
            }
        };

        const { queryPapers } = await import("../src/notion-client.js");
        const papers = await queryPapers("db-1", qMockClient as any);

        expect(papers.length).toBe(2);
        expect(papers[0].title).toBe("");
        expect(papers[0].doi).toBe(undefined);
        expect(papers[0].semanticScholarId).toBe(undefined);
        expect(papers[1].title).toBe("");
    });

    it("findDuplicates should handle papers without titles gracefully", async () => {
        const dpMockClient = {
            databases: {
                query: vi.fn().mockResolvedValueOnce({
                    results: [],
                    has_more: false,
                })
            }
        };

        const { findDuplicates } = await import("../src/notion-client.js");
        const result = await findDuplicates(
            "db-1",
            [
                { paperId: "x", title: undefined as any },
            ],
            dpMockClient as any,
        );
        expect(result.duplicateTitles.size).toBe(0);
    });

    it("getDatabase should handle missing properties object safely without throwing undefined", async () => {
        const dbMockClient = {
            databases: {
                retrieve: vi.fn().mockResolvedValueOnce({
                    properties: undefined,
                })
            }
        };

        const { getDatabase } = await import("../src/notion-client.js");
        await expect(getDatabase("db-1", dbMockClient as any)).rejects.toThrow("必須プロパティが不足しています: タイトル, DOI");
    });

    it("getDatabaseInfo should fallback to untitled database name when title is empty or missing", async () => {
        const infoMockClient = {
            databases: {
                retrieve: vi.fn().mockResolvedValueOnce({
                    title: undefined
                })
            },
            users: { me: vi.fn().mockResolvedValueOnce({ name: undefined }) }
        };

        const { getDatabaseInfo } = await import("../src/notion-client.js");
        const info = await getDatabaseInfo("db-1", infoMockClient as any);
        expect(info.databaseName).toBe("(untitled database)");
        expect(info.workspaceName).toBe("Notion Workspace");
    });

    it("getDatabaseInfo should map plain_text properly with gaps", async () => {
        const gapMockClient = {
            databases: {
                retrieve: vi.fn().mockResolvedValueOnce({
                    title: [{ plain_text: undefined }, { plain_text: "  " }]
                })
            },
            users: { me: vi.fn().mockResolvedValueOnce({ name: "   " }) }
        };

        const { getDatabaseInfo } = await import("../src/notion-client.js");
        const info = await getDatabaseInfo("db-1", gapMockClient as any);
        expect(info.databaseName).toBe("(untitled database)");
        expect(info.workspaceName).toBe("Notion Workspace");
    });

    it("queryPapers should handle cursor pagination when next_cursor is null but has_more is true", async () => {
        const cursorMockClient = {
            databases: {
                query: vi.fn().mockResolvedValueOnce({
                    results: [],
                    has_more: true,
                    next_cursor: null,
                })
            }
        };

        const { queryPapers } = await import("../src/notion-client.js");
        const result = await queryPapers("db-1", cursorMockClient as any);

        expect(result).toEqual([]);
        expect(cursorMockClient.databases.query).toHaveBeenCalledTimes(1);
    });

    it("createPaperPage should handle missing externalIds gracefully", async () => {
        mockClient.databases.retrieve.mockResolvedValueOnce({
            properties: {
                "タイトル": { type: "title" },
                "DOI": { type: "rich_text" },
            },
        });
        mockClient.pages.create.mockResolvedValueOnce({ id: "new-page3" });

        const paper = {
            paperId: "s2-4",
            externalIds: undefined
        };

        const { createPaperPage } = await import("../src/notion-client.js");
        await createPaperPage("db-1", paper as any, mockClient as any);

        expect(mockClient.pages.create).toHaveBeenCalledTimes(1);
    });
});