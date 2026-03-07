import { describe, it, expect } from "vitest";
import { buildCitationGraph } from "../src/graph.js";

describe("Performance: multi command", () => {
    it("measures sequential vs concurrent", async () => {
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

        expect(graphsSeq.length).toBe(graphsConc.length);
    }, 60000); // 60s timeout
});
