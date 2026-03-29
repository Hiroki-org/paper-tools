import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { findExistingAuthorPage, saveAuthorProfileToNotion } from "../notion/author-client";
import { Client } from "@notionhq/client";
import type { AuthorProfile } from "@paper-tools/core";

const mockProfile: AuthorProfile = {
    id: "123",
    name: "John Doe",
    hIndex: 10,
    citationCount: 100,
    paperCount: 20,
    affiliations: [{ name: "University A", year: 2023 }],
    homepage: "https://example.com",
    aliases: [],
    sources: ["semantic_scholar"],
};

describe("author-client", () => {
    let mockClient: any;

    beforeEach(() => {
        mockClient = {
            databases: {
                query: vi.fn(),
            },
            pages: {
                create: vi.fn(),
                update: vi.fn(),
            },
        };
        vi.stubEnv("NOTION_AUTHOR_DATABASE_ID", "db-123");
        vi.stubEnv("NOTION_API_KEY", "key-123");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe("findExistingAuthorPage", () => {
        it("should return id by semantic scholar id", async () => {
            mockClient.databases.query.mockResolvedValueOnce({
                results: [{ id: "page-1" }],
            });

            const id = await findExistingAuthorPage(mockProfile, "db-123", mockClient);
            expect(id).toBe("page-1");
            expect(mockClient.databases.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    filter: { property: "Semantic Scholar ID", rich_text: { equals: "123" } },
                }),
            );
        });

        it("should return id by name if id not found", async () => {
            mockClient.databases.query
                .mockResolvedValueOnce({ results: [] })
                .mockResolvedValueOnce({ results: [{ id: "page-2" }] });

            const id = await findExistingAuthorPage(mockProfile, "db-123", mockClient);
            expect(id).toBe("page-2");
            expect(mockClient.databases.query).toHaveBeenCalledTimes(2);
        });

        it("should return null if not found", async () => {
            mockClient.databases.query.mockResolvedValue({ results: [] });

            const id = await findExistingAuthorPage(mockProfile, "db-123", mockClient);
            expect(id).toBeNull();
        });
    });

    describe("saveAuthorProfileToNotion", () => {
        it("should return dry-run action", async () => {
            const result = await saveAuthorProfileToNotion(mockProfile, { dryRun: true }, mockClient);
            expect(result.action).toBe("dry-run");
            expect(mockClient.pages.create).not.toHaveBeenCalled();
            expect(mockClient.pages.update).not.toHaveBeenCalled();
        });

        it("should update existing page", async () => {
            mockClient.databases.query.mockResolvedValueOnce({
                results: [{ id: "page-1" }],
            });
            mockClient.pages.update.mockResolvedValueOnce({ id: "page-1" });

            const result = await saveAuthorProfileToNotion(mockProfile, {}, mockClient);
            expect(result.action).toBe("updated");
            expect(result.pageId).toBe("page-1");
            expect(mockClient.pages.update).toHaveBeenCalled();
        });

        it("should create new page", async () => {
            mockClient.databases.query.mockResolvedValue({ results: [] });
            mockClient.pages.create.mockResolvedValueOnce({ id: "page-new" });

            const result = await saveAuthorProfileToNotion(mockProfile, {}, mockClient);
            expect(result.action).toBe("created");
            expect(result.pageId).toBe("page-new");
            expect(mockClient.pages.create).toHaveBeenCalled();
        });

        it("should throw error if db id missing", async () => {
            vi.unstubAllEnvs();
            await expect(saveAuthorProfileToNotion(mockProfile, {}, mockClient)).rejects.toThrow(
                "NOTION_AUTHOR_DATABASE_ID が未設定です",
            );
        });
    });
});
