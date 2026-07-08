import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    getAccessToken: vi.fn(),
    getSelectedDatabaseId: vi.fn(),
    getUserInfo: vi.fn(),
    getNotionClient: vi.fn(),
}));

vi.mock("@/lib/notion-data-source", () => ({
    resolveNotionDataSource: vi.fn(),
}));

const auth = await import("@/lib/auth");
const notionDataSource = await import("@/lib/notion-data-source");
const { GET, POST } = await import("./route");

describe("/api/archive", () => {
    let mockQuery: ReturnType<typeof vi.fn>;
    let mockCreate: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockQuery = vi.fn().mockResolvedValue({ results: [] });
        mockCreate = vi.fn().mockResolvedValue({});

        vi.mocked(auth.getAccessToken).mockReturnValue("fake-token");
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValue("fake-db-id");
        vi.mocked(auth.getUserInfo).mockReturnValue({ workspaceName: "Fake Workspace" });
        vi.mocked(auth.getNotionClient).mockReturnValue({
            dataSources: { query: mockQuery },
            pages: { create: mockCreate },
        } as unknown as ReturnType<typeof auth.getNotionClient>);

        vi.mocked(notionDataSource.resolveNotionDataSource).mockResolvedValue({
            object: "data_source",
            id: "fake-ds-id",
            title: [{ plain_text: "Fake Database" }],
            properties: {
                "Name": { type: "title", title: {} },
                "DOI": { type: "rich_text", rich_text: {} },
                "Semantic Scholar": { type: "rich_text", rich_text: {} },
            },
        });
    });

    describe("GET", () => {
        it("returns 401 if access token is missing", async () => {
            vi.mocked(auth.getAccessToken).mockReturnValueOnce(null);
            const req = new NextRequest("http://localhost/api/archive");
            const res = await GET(req);
            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.error).toBe("Not authenticated");
        });

        it("returns 400 if database id is missing", async () => {
            vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce(null);
            const req = new NextRequest("http://localhost/api/archive");
            const res = await GET(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe("Database is not selected");
        });

        it("returns empty records if no pages found", async () => {
            const req = new NextRequest("http://localhost/api/archive");
            const res = await GET(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.records).toHaveLength(0);
            expect(data.total).toBe(0);
            expect(data.database).toEqual({
                databaseId: "fake-ds-id",
                databaseName: "Fake Database",
                workspaceName: "Fake Workspace",
            });
            expect(mockQuery).toHaveBeenCalledWith({ data_source_id: "fake-ds-id", page_size: 100 });
        });

        it("maps page records correctly", async () => {
            mockQuery.mockResolvedValueOnce({
                results: [
                    {
                        object: "page",
                        id: "page-1",
                        properties: {
                            "Name": { type: "title", title: [{ plain_text: "Test Paper" }] },
                            "DOI": { type: "rich_text", rich_text: [{ plain_text: "10.1234/test" }] },
                            "Semantic Scholar": { type: "rich_text", rich_text: [{ plain_text: "s2-123" }] },
                        },
                    },
                    {
                        object: "page",
                        id: "page-2",
                        properties: {
                            "Name": { type: "title", title: [] }, // untitled
                        },
                    },
                    {
                        object: "not-a-page",
                        id: "page-3",
                    }
                ],
            });

            const req = new NextRequest("http://localhost/api/archive");
            const res = await GET(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.records).toHaveLength(2); // filters out not-a-page
            expect(data.records[0]).toEqual({
                pageId: "page-1",
                title: "Test Paper",
                doi: "10.1234/test",
                semanticScholarId: "s2-123",
            });
            expect(data.records[1]).toEqual({
                pageId: "page-2",
                title: "(untitled)",
            });
            expect(data.total).toBe(2);
        });

        it("returns 500 on error", async () => {
            mockQuery.mockRejectedValueOnce(new Error("Notion API Error"));
            const req = new NextRequest("http://localhost/api/archive");
            const res = await GET(req);
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe("Notion API Error");
        });

        it("returns 500 on non-Error error", async () => {
            mockQuery.mockRejectedValueOnce("Unknown Error String");
            const req = new NextRequest("http://localhost/api/archive");
            const res = await GET(req);
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe("Unknown error");
        });
    });

    describe("POST", () => {
        const mockPaper = {
            paperId: "s2-456",
            title: "New Test Paper",
            externalIds: { DOI: "10.5678/new" },
        };

        it("returns 401 if access token is missing", async () => {
            vi.mocked(auth.getAccessToken).mockReturnValueOnce(null);
            const req = new NextRequest("http://localhost/api/archive", {
                method: "POST",
                body: JSON.stringify({ paper: mockPaper }),
            });
            const res = await POST(req);
            expect(res.status).toBe(401);
        });

        it("returns 400 if database id is missing", async () => {
            vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce(null);
            const req = new NextRequest("http://localhost/api/archive", {
                method: "POST",
                body: JSON.stringify({ paper: mockPaper }),
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
        });

        it("returns 400 if paper is missing from body", async () => {
            const req = new NextRequest("http://localhost/api/archive", {
                method: "POST",
                body: JSON.stringify({}),
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe("paper is required");
        });

        it("creates a page in notion successfully", async () => {
            const req = new NextRequest("http://localhost/api/archive", {
                method: "POST",
                body: JSON.stringify({ paper: mockPaper }),
            });
            const res = await POST(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);

            expect(mockCreate).toHaveBeenCalledWith({
                parent: { data_source_id: "fake-ds-id" },
                properties: {
                    "Name": { title: [{ text: { content: "New Test Paper" } }] },
                    "DOI": { rich_text: [{ text: { content: "10.5678/new" } }] },
                    "Semantic Scholar": { rich_text: [{ text: { content: "s2-456" } }] },
                },
            });
        });

        it("handles url type for DOI", async () => {
             vi.mocked(notionDataSource.resolveNotionDataSource).mockResolvedValueOnce({
                object: "data_source",
                id: "fake-ds-id",
                properties: {
                    "Name": { type: "title", title: {} },
                    "DOI": { type: "url", url: "" },
                },
            });

            const req = new NextRequest("http://localhost/api/archive", {
                method: "POST",
                body: JSON.stringify({ paper: mockPaper }),
            });
            await POST(req);

            expect(mockCreate).toHaveBeenCalledWith({
                parent: { data_source_id: "fake-ds-id" },
                properties: {
                    "Name": { title: [{ text: { content: "New Test Paper" } }] },
                    "DOI": { url: "https://doi.org/10.5678/new" },
                },
            });
        });

        it("handles missing title in paper gracefully", async () => {
            const req = new NextRequest("http://localhost/api/archive", {
                method: "POST",
                body: JSON.stringify({ paper: { paperId: "123" } }),
            });
            await POST(req);

            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
                properties: expect.objectContaining({
                    "Name": { title: [{ text: { content: "Untitled" } }] },
                }),
            }));
        });

        it("returns 500 on error", async () => {
            mockCreate.mockRejectedValueOnce(new Error("Create Error"));
            const req = new NextRequest("http://localhost/api/archive", {
                method: "POST",
                body: JSON.stringify({ paper: mockPaper }),
            });
            const res = await POST(req);
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe("Create Error");
        });

        it("returns 500 on non-Error error in POST", async () => {
            mockCreate.mockRejectedValueOnce("Unknown Create Error");
            const req = new NextRequest("http://localhost/api/archive", {
                method: "POST",
                body: JSON.stringify({ paper: mockPaper }),
            });
            const res = await POST(req);
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe("Unknown error");
        });
    });
});
