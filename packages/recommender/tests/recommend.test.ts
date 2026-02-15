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
});