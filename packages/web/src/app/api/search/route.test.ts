import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { searchByKeyword } from "@paper-tools/drilldown";

vi.mock("@paper-tools/drilldown", () => ({
    searchByKeyword: vi.fn(),
}));

const { GET } = await import("./route.js");

type SearchResult = Awaited<ReturnType<typeof searchByKeyword>>;

function makeRequest(url: string) {
    return new NextRequest(url);
}

describe("/api/search GET", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("qパラメータのみ指定でsearchByKeywordがデフォルトmaxResults(30)で呼ばれる", async () => {
        const mockPapers: SearchResult = [{ paperId: "paper1", title: "Paper 1", authors: [] }];
        vi.mocked(searchByKeyword).mockResolvedValueOnce(mockPapers);

        const res = await GET(makeRequest("http://localhost/api/search?q=test"));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(searchByKeyword).toHaveBeenCalledWith("test", 30);
        expect(data.papers).toEqual(mockPapers);
        expect(data.total).toBe(1);
    });

    it("maxResultsを指定した場合、正しく渡される", async () => {
        const mockPapers: SearchResult = [{ paperId: "paper2", title: "Paper 2", authors: [] }];
        vi.mocked(searchByKeyword).mockResolvedValueOnce(mockPapers);

        const res = await GET(makeRequest("http://localhost/api/search?q=test2&maxResults=50"));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(searchByKeyword).toHaveBeenCalledWith("test2", 50);
        expect(data.papers).toEqual(mockPapers);
    });

    it("maxResultsが100を超える場合は100に制限される", async () => {
        vi.mocked(searchByKeyword).mockResolvedValueOnce([]);

        const res = await GET(makeRequest("http://localhost/api/search?q=test&maxResults=150"));

        expect(res.status).toBe(200);
        expect(searchByKeyword).toHaveBeenCalledWith("test", 100);
    });

    it("maxResultsが1未満の場合は1に制限される", async () => {
        vi.mocked(searchByKeyword).mockResolvedValueOnce([]);

        const res = await GET(makeRequest("http://localhost/api/search?q=test&maxResults=-5"));

        expect(res.status).toBe(200);
        expect(searchByKeyword).toHaveBeenCalledWith("test", 1);
    });

    it("maxResultsが不正な文字列の場合は30になる", async () => {
        vi.mocked(searchByKeyword).mockResolvedValueOnce([]);

        const res = await GET(makeRequest("http://localhost/api/search?q=test&maxResults=abc"));

        expect(res.status).toBe(200);
        expect(searchByKeyword).toHaveBeenCalledWith("test", 30);
    });

    it("qパラメータが未指定の場合は400エラー", async () => {
        const res = await GET(makeRequest("http://localhost/api/search"));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("q parameter is required");
    });

    it("searchByKeywordでErrorが発生した場合は502エラー", async () => {
        vi.mocked(searchByKeyword).mockRejectedValueOnce(new Error("Backend timeout"));

        const res = await GET(makeRequest("http://localhost/api/search?q=test"));
        const data = await res.json();

        expect(res.status).toBe(502);
        expect(data.error).toBe("Search backend failed: Backend timeout");
    });

    it("searchByKeywordでError以外が発生した場合は502エラー(Unknown error)", async () => {
        vi.mocked(searchByKeyword).mockRejectedValueOnce("String error");

        const res = await GET(makeRequest("http://localhost/api/search?q=test"));
        const data = await res.json();

        expect(res.status).toBe(502);
        expect(data.error).toBe("Search backend failed: Unknown error");
    });
});
