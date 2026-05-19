import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@paper-tools/drilldown", () => ({
    drilldown: vi.fn(),
}));

const { drilldown } = await import("@paper-tools/drilldown");
const { POST } = await import("./route");

function makeRequest(body: unknown) {
    return new NextRequest("http://localhost/api/search/drilldown", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
    });
}

describe("/api/search/drilldown POST", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("seedPapersのみ指定でdrilldownがデフォルト引数で呼ばれる", async () => {
        const mockResults = [
            { paperId: "res1", title: "Drilldown Result 1" }
        ];
        vi.mocked(drilldown).mockResolvedValueOnce(mockResults as any);

        const seedPapers = [{ paperId: "seed1", title: "Seed 1" }];
        const res = await POST(makeRequest({ seedPapers }));
        const data = await res.json();

        expect(res.status).toBe(200);
        // seedPapers, depth=1, maxPerLevel=10, enrich=false
        expect(drilldown).toHaveBeenCalledWith(seedPapers, 1, 10, false);
        expect(data.results).toEqual(mockResults);
    });

    it("すべてのパラメータを指定した場合にdrilldownに正しく渡される", async () => {
        const mockResults = [
            { paperId: "res2", title: "Drilldown Result 2" }
        ];
        vi.mocked(drilldown).mockResolvedValueOnce(mockResults as any);

        const seedPapers = [{ paperId: "seed2", title: "Seed 2" }];
        const reqBody = {
            seedPapers,
            depth: 2,
            maxPerLevel: 5,
            enrich: true,
        };
        const res = await POST(makeRequest(reqBody));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(drilldown).toHaveBeenCalledWith(seedPapers, 2, 5, true);
        expect(data.results).toEqual(mockResults);
    });

    it("seedPapersが空配列の場合は400エラー", async () => {
        const res = await POST(makeRequest({ seedPapers: [] }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("seedPapers array is required and must not be empty");
    });

    it("seedPapersが未指定の場合は400エラー", async () => {
        const res = await POST(makeRequest({}));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("seedPapers array is required and must not be empty");
    });

    it("drilldownでエラーが発生した場合は500エラー", async () => {
        vi.mocked(drilldown).mockRejectedValueOnce(new Error("Drilldown failed"));

        // suppress console.error in tests
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const seedPapers = [{ paperId: "seed3", title: "Seed 3" }];
        const res = await POST(makeRequest({ seedPapers }));
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe("Drilldown failed");

        consoleSpy.mockRestore();
    });
});
