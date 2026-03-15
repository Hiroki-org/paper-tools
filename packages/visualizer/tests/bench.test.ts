import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch to simulate large number of citations
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { buildCitationGraph, mergeGraphs } = await import("../src/graph.js");

describe("buildCitationGraph benchmark", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("benchmark graph building with large number of nodes", async () => {
        // Create a large number of citations to mock
        const numNodes = 100000;
        const citations = [];
        for (let i = 0; i < numNodes; i++) {
            citations.push({ citing: `10.1111/citing${i}`, cited: "10.1234/seed", creation: "2024-01" });
        }
        const references = [];
        for (let i = 0; i < numNodes; i++) {
            references.push({ citing: "10.1234/seed", cited: `10.5555/ref${i}`, creation: "2023-06" });
        }

        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => citations,
        });
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => references,
        });

        // Use process.memoryUsage() to track memory
        const startMem = process.memoryUsage().heapUsed;
        const start = performance.now();
        const graph = await buildCitationGraph("10.1234/seed", 1, "both");
        const end = performance.now();
        const endMem = process.memoryUsage().heapUsed;

        console.log(`Time taken to build graph with ${graph.nodes.length} nodes: ${end - start} ms`);
        console.log(`Memory used: ${Math.round((endMem - startMem) / 1024 / 1024)} MB`);

        expect(graph.nodes.length).toBeGreaterThanOrEqual(numNodes * 2 + 1);
        expect(graph.edges).toHaveLength(numNodes * 2);
    });

    it("benchmark mergeGraphs with large number of nodes", async () => {
        const numNodes = 200000;

        const g1 = { nodes: [], edges: [] };
        const g2 = { nodes: [], edges: [] };

        for (let i = 0; i < numNodes; i++) {
            g1.nodes.push({ doi: `10.1111/node${i}` });
            g2.nodes.push({ doi: `10.1111/node${i}` });
        }

        const startMem = process.memoryUsage().heapUsed;
        const start = performance.now();
        const merged = mergeGraphs(g1, g2);
        const end = performance.now();
        const endMem = process.memoryUsage().heapUsed;

        console.log(`Time taken to merge graphs resulting in ${merged.nodes.length} nodes: ${end - start} ms`);
        console.log(`Memory used: ${Math.round((endMem - startMem) / 1024 / 1024)} MB`);

        expect(merged.nodes).toHaveLength(numNodes);
    });
});
