import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getAccessToken, getSelectedDatabaseId, getUserInfo, getNotionClient } from "@/lib/auth";
import { resolveNotionDataSource } from "@/lib/notion-data-source";

vi.mock("@/lib/auth", () => ({
    getAccessToken: vi.fn(),
    getSelectedDatabaseId: vi.fn(),
    getUserInfo: vi.fn(),
    getNotionClient: vi.fn(),
}));

vi.mock("@/lib/notion-data-source", () => ({
    resolveNotionDataSource: vi.fn(),
}));

const { GET, POST } = await import("./route");

function makeRequest(method: "GET" | "POST", body?: unknown) {
    const init: RequestInit = {
        method,
        headers: { "content-type": "application/json" },
    };
    if (body !== undefined && method !== "GET" && method !== "HEAD") {
        init.body = JSON.stringify(body);
    }
    return new NextRequest("http://localhost/api/archive", init);
}

describe("/api/archive", () => {
    let mockQuery: any;
    let mockCreate: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockQuery = vi.fn();
        mockCreate = vi.fn();
        vi.mocked(getNotionClient).mockReturnValue({
            dataSources: { query: mockQuery },
            pages: { create: mockCreate },
        } as any);
        vi.mocked(getAccessToken).mockReturnValue("fake-token");
        vi.mocked(getSelectedDatabaseId).mockReturnValue("db-123");
        vi.mocked(getUserInfo).mockReturnValue({ workspaceName: "Test Workspace" } as any);
        vi.mocked(resolveNotionDataSource).mockResolvedValue({
            id: "db-123",
            title: [{ plain_text: "My DB" }],
            properties: {
                "Name": { type: "title" },
                "DOI": { type: "url" },
                "S2": { type: "rich_text" }
            }
        } as any);
    });

    describe("GET", () => {
        it("認証エラー (401)", async () => {
            vi.mocked(getAccessToken).mockReturnValue(undefined);
            const res = await GET(makeRequest("GET"));
            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.error).toBe("Not authenticated");
        });

        it("DB未選択エラー (400)", async () => {
            vi.mocked(getSelectedDatabaseId).mockReturnValue(undefined);
            const res = await GET(makeRequest("GET"));
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe("Database is not selected");
        });

        it("レコードをパースして返す", async () => {
            mockQuery.mockResolvedValueOnce({
                results: [
                    {
                        object: "page",
                        id: "page-1",
                        properties: {
                            Name: { type: "title", title: [{ plain_text: "Paper 1" }] },
                            DOI: { type: "url", url: "https://doi.org/10.123/456" },
                            S2: { type: "rich_text", rich_text: [{ plain_text: "s2-123" }] },
                        }
                    },
                    {
                        object: "not-page",
                    }
                ]
            });

            const res = await GET(makeRequest("GET"));
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(mockQuery).toHaveBeenCalledWith({
                data_source_id: "db-123",
                page_size: 100,
            });

            expect(data.records).toHaveLength(1);
            expect(data.records[0]).toEqual({
                pageId: "page-1",
                title: "Paper 1",
                doi: "https://doi.org/10.123/456",
                semanticScholarId: "s2-123",
            });
            expect(data.database).toEqual({
                databaseId: "db-123",
                databaseName: "My DB",
                workspaceName: "Test Workspace",
            });
        });

        it("エラー時は500", async () => {
            mockQuery.mockRejectedValueOnce(new Error("Network Error"));
            const res = await GET(makeRequest("GET"));
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe("Network Error");
        });
    });

    describe("POST", () => {
        it("認証エラー (401)", async () => {
            vi.mocked(getAccessToken).mockReturnValue(undefined);
            const res = await POST(makeRequest("POST", { paper: { title: "Test" } }));
            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.error).toBe("Not authenticated");
        });

        it("DB未選択エラー (400)", async () => {
            vi.mocked(getSelectedDatabaseId).mockReturnValue(undefined);
            const res = await POST(makeRequest("POST", { paper: { title: "Test" } }));
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe("Database is not selected");
        });

        it("paperが不足で400", async () => {
            const res = await POST(makeRequest("POST", {}));
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe("paper is required");
        });

        it("ページを作成する", async () => {
            const paper = {
                title: "Test Paper",
                externalIds: { DOI: "10.123/456" },
                paperId: "s2-test",
            };

            const res = await POST(makeRequest("POST", { paper }));
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);

            expect(mockCreate).toHaveBeenCalledWith({
                parent: { data_source_id: "db-123" },
                properties: {
                    Name: { title: [{ text: { content: "Test Paper" } }] },
                    DOI: { url: "https://doi.org/10.123/456" },
                    S2: { rich_text: [{ text: { content: "s2-test" } }] },
                }
            });
        });

        it("DOIプロパティがテキスト型の場合", async () => {
            vi.mocked(resolveNotionDataSource).mockResolvedValueOnce({
                id: "db-123",
                properties: {
                    "Title": { type: "title" },
                    "DOI": { type: "rich_text" },
                }
            } as any);

            const paper = {
                title: "Test Paper",
                externalIds: { DOI: "10.123/456" },
            };

            const res = await POST(makeRequest("POST", { paper }));
            expect(res.status).toBe(200);

            expect(mockCreate).toHaveBeenCalledWith({
                parent: { data_source_id: "db-123" },
                properties: {
                    Title: { title: [{ text: { content: "Test Paper" } }] },
                    DOI: { rich_text: [{ text: { content: "10.123/456" } }] },
                }
            });
        });

        it("タイトルがフォールバックされる", async () => {
            const paper = {};

            const res = await POST(makeRequest("POST", { paper }));
            expect(res.status).toBe(200);

            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
                properties: expect.objectContaining({
                    Name: { title: [{ text: { content: "Untitled" } }] },
                })
            }));
        });

        it("エラー時は500", async () => {
            mockCreate.mockRejectedValueOnce(new Error("API Error"));
            const res = await POST(makeRequest("POST", { paper: { title: "Test" } }));
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe("API Error");
        });
    });
});
