import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const resolveNotionDataSourceMock = vi.fn();
const getAccessTokenMock = vi.fn();
const getSelectedDatabaseIdMock = vi.fn();
const getNotionClientMock = vi.fn();

vi.mock("@/lib/notion-data-source", () => ({
    resolveNotionDataSource: resolveNotionDataSourceMock,
}));

vi.mock("@/lib/auth", () => ({
    getAccessToken: getAccessTokenMock,
    getSelectedDatabaseId: getSelectedDatabaseIdMock,
    getNotionClient: getNotionClientMock,
}));

const { GET } = await import("./route");

describe("/api/tags/suggest GET", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getAccessTokenMock.mockReturnValue("token");
        getSelectedDatabaseIdMock.mockReturnValue("db-1");
    });

    it("q が2文字未満なら候補は空", async () => {
        const req = new NextRequest("http://localhost/api/tags/suggest?q=m");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.suggestions).toEqual([]);
    });

    it("タグ候補を返す", async () => {
        resolveNotionDataSourceMock.mockResolvedValueOnce({
            id: "ds-1",
            properties: {
                Tags: { type: "multi_select" },
            },
        });

        getNotionClientMock.mockReturnValue({
            dataSources: {
                query: vi.fn().mockResolvedValue({
                    results: [
                        {
                            object: "page",
                            properties: {
                                Tags: {
                                    multi_select: [{ name: "Machine Learning" }, { name: "ML" }],
                                },
                            },
                        },
                        {
                            object: "page",
                            properties: {
                                Tags: {
                                    multi_select: [{ name: "machine learning" }, { name: "Data Mining" }],
                                },
                            },
                        },
                    ],
                    has_more: false,
                    next_cursor: null,
                }),
            },
        });

        const req = new NextRequest("http://localhost/api/tags/suggest?q=ma&limit=5");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.suggestions).toEqual(["Machine Learning"]);
    });

    it("未認証は401", async () => {
        getAccessTokenMock.mockReturnValueOnce(null);
        const req = new NextRequest("http://localhost/api/tags/suggest?q=ml");
        const res = await GET(req);
        expect(res.status).toBe(401);
    });
});
