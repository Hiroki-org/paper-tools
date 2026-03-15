import { describe, it, expect } from "vitest";
import { buildCitationGraph } from "../src/graph.js";

describe("Performance: multi command", () => {
    it("measures sequential vs concurrent", async () => {
        const normalizeGraph = (graph: any) => {
            const normalized = {
                ...graph,
                nodes: [...(graph.nodes || [])].sort((a: any, b: any) => 
                    (a.doi || a.id || "").localeCompare(b.doi || b.id || "")
                ),
                edges: [...(graph.edges || [])].sort((a: any, b: any) => {
                    const sourceCompare = (a.source || "").localeCompare(b.source || "");
                    if (sourceCompare !== 0) return sourceCompare;
                    return (a.target || "").localeCompare(b.target || "");
                }),
            };
            return normalized;
        };

        const dois = [
            "10.1145/3597503.3639187",
            "10.1145/3597503.3639188",
            "10.1145/3597503.3639189"
        ];

        // Sequential
        const startSeq = performance.now();
        const graphsSeq = [];
        for (const doi of dois) {
            graphsSeq.push(await buildCitationGraph(doi, 1, "both"));
        }
        const endSeq = performance.now();
        const seqTime = endSeq - startSeq;

        // Concurrent
        const startConc = performance.now();
        const graphsConc = await Promise.all(
            dois.map(doi => buildCitationGraph(doi, 1, "both"))
        );
        const endConc = performance.now();
        const concTime = endConc - startConc;

        console.log(`Sequential time: ${seqTime.toFixed(2)}ms`);
        console.log(`Concurrent time: ${concTime.toFixed(2)}ms`);
        console.log(`Improvement: ${((seqTime - concTime) / seqTime * 100).toFixed(2)}%`);

        // Verify both implementations produce equivalent results by normalizing
        // and deep comparing the graphs
        const normalizedConc = JSON.parse(JSON.stringify(graphsConc)).map(normalizeGraph);
        const normalizedSeq = JSON.parse(JSON.stringify(graphsSeq)).map(normalizeGraph);

        expect(normalizedConc.length).toBe(normalizedSeq.length);
        expect(normalizedConc).toEqual(normalizedSeq);
    }, 60000); // 60s timeout
});
