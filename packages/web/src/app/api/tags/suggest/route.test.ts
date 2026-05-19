import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cache, inFlight } from "./cache";

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
        cache.clear();
        inFlight.clear();
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

    it("同じユーザーとDBのタグ候補をキャッシュする", async () => {
        const queryMock = vi.fn().mockResolvedValue({
            results: [
                {
                    object: "page",
                    properties: {
                        Tags: {
                            multi_select: [{ name: "Machine Learning" }],
                        },
                    },
                },
            ],
            has_more: false,
            next_cursor: null,
        });
        resolveNotionDataSourceMock.mockResolvedValue({
            id: "ds-1",
            properties: {
                Tags: { type: "multi_select" },
            },
        });
        getNotionClientMock.mockReturnValue({
            dataSources: { query: queryMock },
        });

        const first = await GET(new NextRequest("http://localhost/api/tags/suggest?q=ma"));
        const second = await GET(new NextRequest("http://localhost/api/tags/suggest?q=ma"));

        expect((await first.json()).suggestions).toEqual(["Machine Learning"]);
        expect((await second.json()).suggestions).toEqual(["Machine Learning"]);
        expect(resolveNotionDataSourceMock).toHaveBeenCalledTimes(1);
        expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it("アクセストークンが異なるユーザー間でキャッシュを共有しない", async () => {
        const queryA = vi.fn().mockResolvedValue({
            results: [
                {
                    object: "page",
                    properties: {
                        Tags: {
                            multi_select: [{ name: "Private Alpha" }],
                        },
                    },
                },
            ],
            has_more: false,
            next_cursor: null,
        });
        const queryB = vi.fn().mockResolvedValue({
            results: [
                {
                    object: "page",
                    properties: {
                        Tags: {
                            multi_select: [{ name: "Public Beta" }],
                        },
                    },
                },
            ],
            has_more: false,
            next_cursor: null,
        });
        resolveNotionDataSourceMock.mockResolvedValue({
            id: "ds-1",
            properties: {
                Tags: { type: "multi_select" },
            },
        });
        getAccessTokenMock.mockReturnValueOnce("token-a").mockReturnValueOnce("token-b");
        getNotionClientMock
            .mockReturnValueOnce({ dataSources: { query: queryA } })
            .mockReturnValueOnce({ dataSources: { query: queryB } });

        const first = await GET(new NextRequest("http://localhost/api/tags/suggest?q=pr"));
        const second = await GET(new NextRequest("http://localhost/api/tags/suggest?q=pu"));

        expect((await first.json()).suggestions).toEqual(["Private Alpha"]);
        expect((await second.json()).suggestions).toEqual(["Public Beta"]);
        expect(queryA).toHaveBeenCalledTimes(1);
        expect(queryB).toHaveBeenCalledTimes(1);
    });

    it("同時リクエストでは同じ取得処理を共有する", async () => {
        let resolveQuery: (value: {
            results: Array<Record<string, unknown>>;
            has_more: boolean;
            next_cursor: null;
        }) => void;
        const queryPromise = new Promise<{
            results: Array<Record<string, unknown>>;
            has_more: boolean;
            next_cursor: null;
        }>((resolve) => {
            resolveQuery = resolve;
        });
        const queryMock = vi.fn().mockReturnValue(queryPromise);
        resolveNotionDataSourceMock.mockResolvedValue({
            id: "ds-1",
            properties: {
                Tags: { type: "multi_select" },
            },
        });
        getNotionClientMock.mockReturnValue({
            dataSources: { query: queryMock },
        });

        const first = GET(new NextRequest("http://localhost/api/tags/suggest?q=ma"));
        const second = GET(new NextRequest("http://localhost/api/tags/suggest?q=ma"));

        await vi.waitFor(() => expect(queryMock).toHaveBeenCalledTimes(1));
        resolveQuery!({
            results: [
                {
                    object: "page",
                    properties: {
                        Tags: {
                            multi_select: [{ name: "Machine Learning" }],
                        },
                    },
                },
            ],
            has_more: false,
            next_cursor: null,
        });

        const [firstRes, secondRes] = await Promise.all([first, second]);
        expect((await firstRes.json()).suggestions).toEqual(["Machine Learning"]);
        expect((await secondRes.json()).suggestions).toEqual(["Machine Learning"]);
        expect(resolveNotionDataSourceMock).toHaveBeenCalledTimes(1);
    });

    it("未認証は401", async () => {
        getAccessTokenMock.mockReturnValueOnce(null);
        const req = new NextRequest("http://localhost/api/tags/suggest?q=ml");
        const res = await GET(req);
        expect(res.status).toBe(401);
    });
});
