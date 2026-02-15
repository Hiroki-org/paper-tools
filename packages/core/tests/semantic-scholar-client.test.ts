import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const {
    getRecommendationsForPaper,
    getRecommendations,
    getPaper,
} = await import("../src/semantic-scholar-client.js");

describe("Semantic Scholar Client", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("getRecommendationsForPaper should parse recommended papers", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                recommendedPapers: [
                    {
                        paperId: "p1",
                        title: "Recommended Paper 1",
                        year: 2024,
                        authors: [{ name: "Alice" }],
                    },
                ],
            }),
        });

        const result = await getRecommendationsForPaper("DOI:10.1000/xyz");
        expect(result.recommendedPapers.length).toBe(1);
        expect(result.recommendedPapers[0]?.paperId).toBe("p1");
    });

    it("getRecommendations POST should include positive/negative IDs", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ recommendedPapers: [] }),
        });

        await getRecommendations(["p1", "p2"], ["n1"], { limit: 5 });

        const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(requestInit.method).toBe("POST");
        expect(typeof requestInit.body).toBe("string");
        expect(JSON.parse(requestInit.body as string)).toEqual({
            positivePaperIds: ["p1", "p2"],
            negativePaperIds: ["n1"],
        });
    });

    it("getPaper should parse paper details", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                paperId: "paper-1",
                title: "A Study on Recommenders",
                year: 2023,
                externalIds: { DOI: "10.1000/abc" },
            }),
        });

        const paper = await getPaper("paper-1");
        expect(paper.paperId).toBe("paper-1");
        expect(paper.externalIds?.DOI).toBe("10.1000/abc");
    });

    it("should attach x-api-key header when S2_API_KEY is set", async () => {
        const previous = process.env["S2_API_KEY"];
        process.env["S2_API_KEY"] = "dummy-key";

        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ recommendedPapers: [] }),
        });

        const { getRecommendationsForPaper: fnWithKey } = await import("../src/semantic-scholar-client.js");
        await fnWithKey("paper-key-test");
        const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect((requestInit.headers as Record<string, string>)["x-api-key"]).toBe("dummy-key");

        if (previous === undefined) {
            delete process.env["S2_API_KEY"];
        } else {
            process.env["S2_API_KEY"] = previous;
        }
    });
});