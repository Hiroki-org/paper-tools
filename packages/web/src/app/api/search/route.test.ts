import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/lib/auth";

vi.mock("@paper-tools/drilldown", () => ({
    searchByKeyword: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    isAuthenticated: vi.fn(() => true),
}));

const drilldown = await import("@paper-tools/drilldown");
const { GET } = await import("./route");

// @vitest-environment jsdom

describe("/api/search GET", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(auth.isAuthenticated).mockReturnValue(true);
    });

    it("認証されていない場合は 401 を返す", async () => {
        vi.mocked(auth.isAuthenticated).mockReturnValueOnce(false);
        const req = new NextRequest("http://localhost/api/search");
        const res = await GET(req);
        const data = await res.json();
        expect(res.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("qパラメータがない場合は 400 を返す", async () => {
        const req = new NextRequest("http://localhost/api/search");
        const res = await GET(req);
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toBe("q parameter is required");
    });

    it("qパラメータがある場合は検索結果を返す", async () => {
        vi.mocked(drilldown.searchByKeyword).mockResolvedValueOnce([{ title: "Paper 1" }] as any);
        const req = new NextRequest("http://localhost/api/search?q=test");
        const res = await GET(req);
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(drilldown.searchByKeyword).toHaveBeenCalledWith("test", 30);
        expect(data.papers).toHaveLength(1);
        expect(data.total).toBe(1);
    });
});
