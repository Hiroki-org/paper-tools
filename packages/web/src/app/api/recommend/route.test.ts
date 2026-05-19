import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/lib/auth";

vi.mock("@paper-tools/recommender", () => ({
    recommendFromSingle: vi.fn(),
    recommendFromMultiple: vi.fn(),
    resolveToS2Id: vi.fn((id) => Promise.resolve("s2-" + id)),
}));

vi.mock("@/lib/auth", () => ({
    isAuthenticated: vi.fn(() => true),
}));

const recommender = await import("@paper-tools/recommender");
const { POST } = await import("./route");

function makeRequest(body: unknown) {
    return new NextRequest("http://localhost/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

// @vitest-environment jsdom

describe("/api/recommend POST", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(auth.isAuthenticated).mockReturnValue(true);
        vi.mocked(recommender.resolveToS2Id).mockImplementation((id) => Promise.resolve("s2-" + id));
    });

    it("認証されていない場合は 401 を返す", async () => {
        vi.mocked(auth.isAuthenticated).mockReturnValueOnce(false);
        const req = makeRequest({ paperId: "123" });
        const res = await POST(req);
        const data = await res.json();
        expect(res.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("paperId が指定された場合、recommendFromSingle を呼び出す", async () => {
        vi.mocked(recommender.recommendFromSingle).mockResolvedValueOnce([{ title: "Paper 1" }] as any);
        const req = makeRequest({ paperId: "123" });
        const res = await POST(req);
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(recommender.recommendFromSingle).toHaveBeenCalledWith("s2-123", { limit: undefined, from: undefined });
        expect(data.papers).toHaveLength(1);
    });

    it("positiveIds が指定された場合、recommendFromMultiple を呼び出す", async () => {
        vi.mocked(recommender.recommendFromMultiple).mockResolvedValueOnce([{ title: "Paper 1" }] as any);
        const req = makeRequest({ positiveIds: ["123", "456"] });
        const res = await POST(req);
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(recommender.recommendFromMultiple).toHaveBeenCalledWith(["s2-123", "s2-456"], [], { limit: undefined });
        expect(data.papers).toHaveLength(1);
    });
});
