import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { findExistingAuthorPage, saveAuthorProfileToNotion } from "../notion/author-client.js";
import { Client } from "@notionhq/client";

vi.mock("@notionhq/client", () => {
    return {
        Client: vi.fn().mockImplementation(() => {
            return {
                databases: {
                    query: vi.fn(),
                },
                pages: {
                    update: vi.fn(),
                    create: vi.fn(),
                },
            };
        }),
    };
});

describe("author-client", () => {
    let mockClient: any;

    const sampleProfile = {
        id: "s2-123",
        name: "John Doe",
        hIndex: 10,
        citationCount: 100,
        paperCount: 50,
        homepage: "https://example.com",
        affiliations: [{ name: "University A", year: "2023" }, { name: "University B" }]
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("NOTION_API_KEY", "test-api-key");
        vi.stubEnv("NOTION_AUTHOR_DATABASE_ID", "test-db-id");

        mockClient = {
            databases: { query: vi.fn() },
            pages: { update: vi.fn(), create: vi.fn() }
        } as unknown as Client;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    describe("findExistingAuthorPage", () => {
        it("should return page ID if found by Semantic Scholar ID", async () => {
            mockClient.databases.query.mockResolvedValueOnce({
                results: [{ id: "page-123" }]
            });

            const result = await findExistingAuthorPage(sampleProfile, "test-db-id", mockClient);

            expect(result).toBe("page-123");
            expect(mockClient.databases.query).toHaveBeenCalledTimes(1);
            expect(mockClient.databases.query).toHaveBeenCalledWith(expect.objectContaining({
                filter: {
                    property: "Semantic Scholar ID",
                    rich_text: { equals: "s2-123" },
                }
            }));
        });

        it("should return page ID if found by Name when ID search fails", async () => {
            mockClient.databases.query
                .mockResolvedValueOnce({ results: [] }) // first query by ID returns empty
                .mockResolvedValueOnce({ results: [{ id: "page-456" }] }); // second query by Name returns result

            const result = await findExistingAuthorPage(sampleProfile, "test-db-id", mockClient);

            expect(result).toBe("page-456");
            expect(mockClient.databases.query).toHaveBeenCalledTimes(2);
        });

        it("should return null if no matching author is found", async () => {
            mockClient.databases.query
                .mockResolvedValueOnce({ results: [] })
                .mockResolvedValueOnce({ results: [] });

            const result = await findExistingAuthorPage(sampleProfile, "test-db-id", mockClient);

            expect(result).toBeNull();
        });
    });

    describe("saveAuthorProfileToNotion", () => {
        it("should throw if database ID is not set", async () => {
            vi.unstubAllEnvs();

            await expect(saveAuthorProfileToNotion(sampleProfile, {}, mockClient))
                .rejects.toThrow("NOTION_AUTHOR_DATABASE_ID が未設定です");
        });

        it("should return dry-run action when dryRun option is true", async () => {
            const result = await saveAuthorProfileToNotion(sampleProfile, { dryRun: true }, mockClient);

            expect(result).toEqual({ action: "dry-run" });
            expect(mockClient.pages.update).not.toHaveBeenCalled();
            expect(mockClient.pages.create).not.toHaveBeenCalled();
        });

        it("should update existing page if found", async () => {
            mockClient.databases.query.mockResolvedValueOnce({
                results: [{ id: "existing-page-id" }]
            });

            const result = await saveAuthorProfileToNotion(sampleProfile, {}, mockClient);

            expect(result).toEqual({ action: "updated", pageId: "existing-page-id" });
            expect(mockClient.pages.update).toHaveBeenCalledWith(expect.objectContaining({
                page_id: "existing-page-id",
            }));
            expect(mockClient.pages.create).not.toHaveBeenCalled();
        });

        it("should create new page if not found", async () => {
            mockClient.databases.query
                .mockResolvedValueOnce({ results: [] })
                .mockResolvedValueOnce({ results: [] });

            mockClient.pages.create.mockResolvedValue({ id: "new-page-id" });

            const result = await saveAuthorProfileToNotion(sampleProfile, {}, mockClient);

            expect(result).toEqual({ action: "created", pageId: "new-page-id" });
            expect(mockClient.pages.create).toHaveBeenCalledWith(expect.objectContaining({
                parent: { database_id: "test-db-id" },
            }));
            expect(mockClient.pages.update).not.toHaveBeenCalled();
        });

        it("should throw error if API key is not set when creating default client", async () => {
            vi.unstubAllEnvs();

            await expect(findExistingAuthorPage(sampleProfile, "db-id")).rejects.toThrow("NOTION_API_KEY が未設定です");
        });
    });
});
