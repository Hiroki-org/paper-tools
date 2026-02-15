import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
const { buildCitationGraph, mergeGraphs } = await import("../src/graph.js");

describe("buildCitationGraph", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("should build a graph with depth=1 (both directions)", async () => {
        // getCitations の応答 (citing → currentDoi を cited として含む)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [
                { citing: "10.1111/citing1", cited: "10.1234/seed", creation: "2024-01" },
            ],
        });
        // getReferences の応答
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [
                { citing: "10.1234/seed", cited: "10.5555/ref1", creation: "2023-06" },
            ],
        });

        const graph = await buildCitationGraph("10.1234/seed", 1, "both");

        expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
        expect(graph.edges).toHaveLength(2);

        const dois = graph.nodes.map((n) => n.doi);
        expect(dois).toContain("10.1234/seed");
        expect(dois).toContain("10.1111/citing1");
        expect(dois).toContain("10.5555/ref1");
    });

    it("should build a graph for citing direction only", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [
                { citing: "10.1111/citing1", cited: "10.1234/seed" },
            ],
        });

        const graph = await buildCitationGraph("10.1234/seed", 1, "citing");

        // getCitations のみ呼ばれる
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
    });

    it("should build a graph for cited direction only", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [
                { citing: "10.1234/seed", cited: "10.5555/ref1" },
            ],
        });

        const graph = await buildCitationGraph("10.1234/seed", 1, "cited");

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle empty citation results", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [],
        });
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [],
        });

        const graph = await buildCitationGraph("10.1234/seed", 1, "both");

        expect(graph.nodes).toHaveLength(1);
        expect(graph.nodes[0].doi).toBe("10.1234/seed");
        expect(graph.edges).toHaveLength(0);
    });

    it("should deduplicate edges", async () => {
        // 同じエッジが citations と references 両方に出る場合
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [
                { citing: "10.1111/a", cited: "10.1234/seed" },
            ],
        });
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [
                { citing: "10.1111/a", cited: "10.1234/seed" },
            ],
        });

        const graph = await buildCitationGraph("10.1234/seed", 1, "both");

        // 重複エッジは1本だけ
        expect(graph.edges).toHaveLength(1);
    });
});

describe("mergeGraphs", () => {
    it("should merge two graphs without duplicate nodes", () => {
        const g1 = {
            nodes: [
                { doi: "10.1/a", title: "Paper A" },
                { doi: "10.2/b" },
            ],
            edges: [{ source: "10.1/a", target: "10.2/b" }],
        };
        const g2 = {
            nodes: [
                { doi: "10.2/b", title: "Paper B" },
                { doi: "10.3/c", title: "Paper C" },
            ],
            edges: [{ source: "10.2/b", target: "10.3/c" }],
        };

        const merged = mergeGraphs(g1, g2);

        expect(merged.nodes).toHaveLength(3);
        expect(merged.edges).toHaveLength(2);

        // g1 で title がなかった 10.2/b に g2 の title がマージされる
        const nodeB = merged.nodes.find((n) => n.doi === "10.2/b");
        expect(nodeB?.title).toBe("Paper B");
    });

    it("should deduplicate edges across graphs", () => {
        const g1 = {
            nodes: [{ doi: "10.1/a" }, { doi: "10.2/b" }],
            edges: [{ source: "10.1/a", target: "10.2/b" }],
        };
        const g2 = {
            nodes: [{ doi: "10.1/a" }, { doi: "10.2/b" }],
            edges: [{ source: "10.1/a", target: "10.2/b" }],
        };

        const merged = mergeGraphs(g1, g2);
        expect(merged.edges).toHaveLength(1);
    });

    it("should handle empty graphs", () => {
        const merged = mergeGraphs(
            { nodes: [], edges: [] },
            { nodes: [{ doi: "10.1/a" }], edges: [] },
        );

        expect(merged.nodes).toHaveLength(1);
        expect(merged.edges).toHaveLength(0);
    });
});
