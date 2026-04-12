import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    getAccessToken: vi.fn(),
    getNotionClient: vi.fn(),
    getSelectedDatabaseId: vi.fn(),
    getUserInfo: vi.fn(),
}));

vi.mock("@/lib/notion-data-source", () => ({
    resolveNotionDataSource: vi.fn(),
}));

const auth = await import("@/lib/auth");
const notionDataSource = await import("@/lib/notion-data-source");
const { GET, POST } = await import("./route");

function makeRequest(body?: unknown) {
    return new NextRequest("http://localhost/api/archive", {
        method: body ? "POST" : "GET",
        body: body ? JSON.stringify(body) : undefined,
        headers: { "content-type": "application/json" },
    });
}

describe("/api/archive GET", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce(null);
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce("db-1");

        const req = makeRequest();
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it("returns 400 when database is not selected", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("token-123");
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce(null);

        const req = makeRequest();
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it("returns records successfully", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("token-123");
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce("db-1");

        const mockNotionClient = {
            dataSources: {
                query: vi.fn().mockResolvedValueOnce({
                    results: [
                        {
                            object: "page",
                            id: "page-1",
                            properties: {
                                "Title": { type: "title", title: [{ plain_text: "Paper Title" }] },
                                "DOI": { type: "rich_text", rich_text: [{ plain_text: "10.123/xyz" }] }
                            }
                        }
                    ]
                })
            }
        };
        vi.mocked(auth.getNotionClient).mockReturnValueOnce(mockNotionClient as any);

        vi.mocked(notionDataSource.resolveNotionDataSource).mockResolvedValueOnce({
            id: "ds-1",
            title: [{ plain_text: "My Database" }]
        } as any);

        vi.mocked(auth.getUserInfo).mockReturnValueOnce({ workspaceName: "My Workspace" });

        const req = makeRequest();
        const res = await GET(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.records).toHaveLength(1);
        expect(data.records[0].title).toBe("Paper Title");
        expect(data.records[0].doi).toBe("10.123/xyz");
        expect(data.database.databaseName).toBe("My Database");
        expect(data.database.workspaceName).toBe("My Workspace");
    });

    it("handles errors gracefully", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("token-123");
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce("db-1");

        vi.mocked(auth.getNotionClient).mockImplementationOnce(() => {
            throw new Error("API failure");
        });

        const req = makeRequest();
        const res = await GET(req);
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.error).toBe("API failure");
    });
});

describe("/api/archive POST", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce(null);
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce("db-1");

        const req = makeRequest({ paper: { title: "Test" } });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it("returns 400 when database is not selected", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("token-123");
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce(null);

        const req = makeRequest({ paper: { title: "Test" } });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("returns 400 when paper is missing", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("token-123");
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce("db-1");

        const req = makeRequest({});
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("creates a page successfully", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("token-123");
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce("db-1");

        const mockPagesCreate = vi.fn().mockResolvedValueOnce({});
        const mockNotionClient = {
            pages: { create: mockPagesCreate }
        };
        vi.mocked(auth.getNotionClient).mockReturnValueOnce(mockNotionClient as any);

        vi.mocked(notionDataSource.resolveNotionDataSource).mockResolvedValueOnce({
            id: "ds-1",
            properties: {
                "Name": { type: "title" },
                "DOI": { type: "url" },
                "Semantic Scholar": { type: "rich_text" }
            }
        } as any);

        const req = makeRequest({
            paper: {
                paperId: "s2-id-123",
                title: "My Paper",
                externalIds: { DOI: "10.123/xyz" }
            }
        });
        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.success).toBe(true);

        expect(mockPagesCreate).toHaveBeenCalledWith(expect.objectContaining({
            parent: { data_source_id: "ds-1" },
            properties: {
                "Name": { title: [{ text: { content: "My Paper" } }] },
                "DOI": { url: "https://doi.org/10.123/xyz" },
                "Semantic Scholar": { rich_text: [{ text: { content: "s2-id-123" } }] }
            }
        }));
    });

    it("handles errors gracefully", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("token-123");
        vi.mocked(auth.getSelectedDatabaseId).mockReturnValueOnce("db-1");

        const req = makeRequest({ paper: { title: "Test" } });

        // Simulating an error in JSON parsing or later stages
        vi.mocked(auth.getNotionClient).mockImplementationOnce(() => {
            throw new Error("Failed to create page");
        });

        const res = await POST(req);
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.error).toBe("Failed to create page");
    });
});
