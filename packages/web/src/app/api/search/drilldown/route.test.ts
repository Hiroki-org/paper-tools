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

function makeRawRequest(body?: BodyInit) {
    return new NextRequest("http://localhost/api/search/drilldown", {
        method: "POST",
        body,
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
        expect(drilldown).not.toHaveBeenCalled();
    });

    it("リクエストボディがnullの場合は400エラー", async () => {
        const res = await POST(makeRequest(null));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("Invalid request body");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it.each([
        ["配列", [{ seedPapers: [{ paperId: "seed-array", title: "Seed array" }] }]],
        ["文字列", "string"],
        ["数値", 123],
    ])("リクエストボディが%sの場合は400エラー", async (_, body) => {
        const res = await POST(makeRequest(body));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("Invalid request body");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it("空のリクエストボディの場合は400エラー", async () => {
        const res = await POST(makeRawRequest());
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("Invalid JSON request body");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it("不正なJSONボディの場合は400エラー", async () => {
        const res = await POST(makeRawRequest("{invalid"));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("Invalid JSON request body");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it("seedPapersが未指定の場合は400エラー", async () => {
        const res = await POST(makeRequest({}));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("seedPapers array is required and must not be empty");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it("seedPapersが配列ではない場合は400エラー", async () => {
        const res = await POST(makeRequest({ seedPapers: "paper-1" }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("seedPapers array is required and must not be empty");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it("seedPapersが100件を超える場合は400エラー", async () => {
        const seedPapers = Array.from({ length: 101 }, (_, index) => ({
            paperId: `seed-${index}`,
            title: `Seed ${index}`,
        }));

        const res = await POST(makeRequest({ seedPapers }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("seedPapers array must contain 100 papers or fewer");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it.each([
        ["0", 0],
        ["小数", 1.5],
        ["上限超過", 6],
        ["文字列", "2"],
    ])("depthが%sの場合は400エラー", async (_, depth) => {
        const seedPapers = [{ paperId: "seed-depth", title: "Seed depth" }];
        const res = await POST(makeRequest({ seedPapers, depth }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("depth must be an integer between 1 and 5");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it.each([
        ["0", 0],
        ["小数", 10.5],
        ["上限超過", 101],
        ["文字列", "10"],
    ])("maxPerLevelが%sの場合は400エラー", async (_, maxPerLevel) => {
        const seedPapers = [{ paperId: "seed-max", title: "Seed max" }];
        const res = await POST(makeRequest({ seedPapers, maxPerLevel }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("maxPerLevel must be an integer between 1 and 100");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it.each([
        ["数値", 1],
        ["文字列", "false"],
        ["null", null],
    ])("enrichが%sの場合は400エラー", async (_, enrich) => {
        const seedPapers = [{ paperId: "seed-enrich", title: "Seed enrich" }];
        const res = await POST(makeRequest({ seedPapers, enrich }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("enrich must be a boolean");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it("titleがないseedPapersの場合は400エラー", async () => {
        const res = await POST(makeRequest({ seedPapers: [{ paperId: "seed-no-title" }] }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("seedPapers must each include a title");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it.each([
        ["空白のみのtitle", { paperId: "seed-blank-title", title: "   " }],
        ["非文字列のtitle", { paperId: "seed-number-title", title: 123 }],
    ])("%sのseedPapersの場合は400エラー", async (_, seedPaper) => {
        const res = await POST(makeRequest({ seedPapers: [seedPaper] }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain("seedPapers must each include a title");
        expect(drilldown).not.toHaveBeenCalled();
    });

    it("drilldownでエラーが発生した場合は500エラー", async () => {
        vi.mocked(drilldown).mockRejectedValueOnce(new Error("Drilldown failed"));

        // suppress console.error in tests
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const seedPapers = [{ paperId: "seed3", title: "Seed 3" }];
        const res = await POST(makeRequest({ seedPapers }));
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toContain("Drilldown failed");

        consoleSpy.mockRestore();
    });
});
