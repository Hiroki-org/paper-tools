import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@paper-tools/core", () => ({
    getPaper: vi.fn(),
    searchPapers: vi.fn(),
    getRecommendationsForPaper: vi.fn(),
    getRecommendations: vi.fn(),
}));

const core = await import("@paper-tools/core");
const { resolveToS2Id, recommendFromMultiple, recommendFromSingle } = await import("../src/recommend.js");

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

    it("positiveIdsが空なら空配列を返す", async () => {
        const result = await recommendFromMultiple([], ["neg1"]);
        expect(result).toEqual([]);
    });

    it("positiveIdsとnegativeIdsを並行して解決し、推薦を取得する", async () => {
        vi.mocked(core.getPaper).mockResolvedValue({ paperId: "s2-id", title: "T" } as any);
        vi.mocked(core.getRecommendations).mockResolvedValueOnce({
            recommendedPapers: [{ paperId: "rec1", title: "R1" } as any],
        });

        const result = await recommendFromMultiple(["DOI:10.1000/pos1", "DOI:10.1000/pos2"], ["DOI:10.1000/neg1"]);

        expect(result).toEqual([{ paperId: "rec1", title: "R1" }]);
        expect(core.getRecommendations).toHaveBeenCalledWith(
            ["s2-id", "s2-id"],
            ["s2-id"],
            { limit: 20 }
        );
    });

    it("解決に失敗したIDは除外して推薦を取得する", async () => {
        // Mock default for the negatives
        vi.mocked(core.getPaper).mockResolvedValue({ paperId: "s2-id", title: "T" } as any);
        // Overwrite the first one
        vi.mocked(core.getPaper).mockResolvedValueOnce({ paperId: "s2-id-pos1", title: "T" } as any);

        vi.mocked(core.getRecommendations).mockResolvedValueOnce({
            recommendedPapers: [{ paperId: "rec2", title: "R2" } as any],
        });

        // "   " is empty string, throws inside resolveToS2Id. So it rejects immediately.
        const result = await recommendFromMultiple(["DOI:10.1000/pos1", "   "], ["DOI:10.1000/neg1", "   "]);

        expect(result).toEqual([{ paperId: "rec2", title: "R2" }]);
        expect(core.getRecommendations).toHaveBeenCalledWith(
            ["s2-id-pos1"],
            ["s2-id"],
            { limit: 20 }
        );
    });

    it("有効なpositiveIdsが一つもなければ空配列を返す", async () => {
        const result = await recommendFromMultiple(["   "], ["DOI:10.1000/neg1"]);
        expect(result).toEqual([]);
        expect(core.getRecommendations).not.toHaveBeenCalled();
    });

    it("大量のIDがある場合はワーカープールで処理される", async () => {
        let callCount = 0;
        vi.mocked(core.getPaper).mockImplementation(async () => {
            callCount++;
            return { paperId: `s2-id-${callCount}`, title: "T" } as any;
        });

        vi.mocked(core.getRecommendations).mockResolvedValueOnce({
            recommendedPapers: [{ paperId: "rec3", title: "R3" } as any],
        });

        const posIds = Array.from({ length: 15 }, (_, i) => `DOI:10.1000/pos${i}`);
        const negIds = Array.from({ length: 15 }, (_, i) => `DOI:10.1000/neg${i}`);

        const result = await recommendFromMultiple(posIds, negIds);

        expect(result).toEqual([{ paperId: "rec3", title: "R3" }]);
        // Positives and negatives are resolved. Because they run concurrently and we increment callCount, the exact IDs aren't fully deterministic,
        // but we know it's an array of 15 items and 15 items.
        expect(core.getRecommendations).toHaveBeenCalled();
        const args = vi.mocked(core.getRecommendations).mock.calls[0];
        expect(args[0]).toHaveLength(15);
        expect(args[1]).toHaveLength(15);
    });
});

describe("recommendFromSingle", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("単一の論文から推薦を取得する", async () => {
        vi.mocked(core.getPaper).mockResolvedValueOnce({ paperId: "s2-single", title: "T" } as any);
        vi.mocked(core.getRecommendationsForPaper).mockResolvedValueOnce({
            recommendedPapers: [{ paperId: "rec4", title: "R4" } as any],
        });

        const result = await recommendFromSingle("DOI:10.1000/paper1", { limit: 5 });
        expect(result).toEqual([{ paperId: "rec4", title: "R4" }]);
        expect(core.getRecommendationsForPaper).toHaveBeenCalledWith("s2-single", { limit: 5, from: "recent" });
    });
});
