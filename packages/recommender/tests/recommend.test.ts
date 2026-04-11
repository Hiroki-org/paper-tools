import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@paper-tools/core", () => ({
    getPaper: vi.fn(),
    searchPapers: vi.fn(),
    getRecommendationsForPaper: vi.fn(),
    getRecommendations: vi.fn(),
}));

const core = await import("@paper-tools/core");
const { resolveToS2Id } = await import("../src/recommend.js");

describe("recommend resolveToS2Id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("DOIをS2IDに変換できる", async () => {
        vi.mocked(core.getPaper).mockResolvedValueOnce({ paperId: "s2-doi", title: "t" } as any);

        const id = await resolveToS2Id("10.1000/xyz");
        expect(id).toBe("s2-doi");
        expect(core.getPaper).toHaveBeenCalledWith("DOI:10.1000/xyz");
    });

    it("S2IDはそのまま返す", async () => {
        const id = await resolveToS2Id("abcdef123456");
        expect(id).toBe("abcdef123456");
    });

    it("タイトルから検索してS2IDを返す", async () => {
        vi.mocked(core.searchPapers).mockResolvedValueOnce({
            total: 1,
            offset: 0,
            data: [{ paperId: "s2-title", title: "A Title" }],
        } as any);

        const id = await resolveToS2Id("A Title");
        expect(id).toBe("s2-title");
        expect(core.searchPapers).toHaveBeenCalled();
    });

    it("空文字入力はエラー", async () => {
        await expect(resolveToS2Id("   ")).rejects.toThrow("identifier が空です");
    });

    it("DOIプレフィックス付き入力はそのままgetPaperに渡す", async () => {
        vi.mocked(core.getPaper).mockResolvedValueOnce({ paperId: "s2-doi-prefix", title: "t" } as any);

        const id = await resolveToS2Id("DOI:10.1000/xyz");
        expect(id).toBe("s2-doi-prefix");
        expect(core.getPaper).toHaveBeenCalledWith("DOI:10.1000/xyz");
    });

    it("タイトル検索結果が空ならエラー", async () => {
        vi.mocked(core.searchPapers).mockResolvedValueOnce({
            total: 0,
            offset: 0,
            data: [],
        } as any);

        await expect(resolveToS2Id("Unknown Title")).rejects.toThrow("タイトルから論文を解決できませんでした");
    });
});

describe("recommendFromMultiple", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("positiveIdsが空の場合は空配列を返す", async () => {
        const { recommendFromMultiple } = await import("../src/recommend.js");
        const results = await recommendFromMultiple([]);
        expect(results).toEqual([]);
        expect(core.getRecommendations).not.toHaveBeenCalled();
    });

    it("すべての解決に成功した場合、正しく推薦APIを呼び出す", async () => {
        // mock resolveToS2Id indirectly by mocking getPaper since it relies on it
        // and we provide simple S2 IDs which resolve directly
        const { recommendFromMultiple } = await import("../src/recommend.js");

        vi.mocked(core.getRecommendations).mockResolvedValueOnce({
            recommendedPapers: [{ paperId: "rec1", title: "R1" } as any],
        });

        const results = await recommendFromMultiple(["pos1", "pos2"], ["neg1"]);
        expect(results).toHaveLength(1);
        expect(results[0].paperId).toBe("rec1");
        expect(core.getRecommendations).toHaveBeenCalledWith(
            ["pos1", "pos2"],
            ["neg1"],
            { limit: 20 }
        );
    });

    it("解決に失敗したIDはフィルタリングされる", async () => {
        const { recommendFromMultiple } = await import("../src/recommend.js");

        // title search fails for "bad-title", works for "good-title"
        vi.mocked(core.searchPapers).mockImplementation(async (query) => {
            if (query === "bad-title") {
                return { total: 0, offset: 0, data: [] } as any;
            }
            return { total: 1, offset: 0, data: [{ paperId: `s2-${query}` }] } as any;
        });

        vi.mocked(core.getRecommendations).mockResolvedValueOnce({
            recommendedPapers: [{ paperId: "rec2", title: "R2" } as any],
        });

        const results = await recommendFromMultiple(
            ["title:good-title", "title:bad-title", "direct-id"],
            ["title:bad-title2", "neg-id"]
        );

        expect(results).toHaveLength(1);
        expect(core.getRecommendations).toHaveBeenCalledWith(
            ["s2-good-title", "direct-id"],
            ["s2-bad-title2", "neg-id"],
            { limit: 20 }
        );
    });

    it("解決後、positiveIdsが空になった場合は空配列を返す", async () => {
        const { recommendFromMultiple } = await import("../src/recommend.js");

        vi.mocked(core.searchPapers).mockResolvedValue({
            total: 0,
            offset: 0,
            data: [],
        } as any);

        const results = await recommendFromMultiple(["title:bad1", "title:bad2"], ["neg1"]);

        expect(results).toEqual([]);
        expect(core.getRecommendations).not.toHaveBeenCalled();
    });
});