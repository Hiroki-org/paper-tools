import { bench, describe } from "vitest";
import { mergeGraphs } from "./src/graph.js";
import type { CitationGraph } from "./src/graph.js";

const generateMockGraph = (size: number, startNode: string): CitationGraph => {
    const nodes = [];
    const edges = [];
    for (let i = 0; i < size; i++) {
        nodes.push({ doi: `doi-${startNode}-${i}` });
    }
    for (let i = 0; i < size - 1; i++) {
        edges.push({ source: `doi-${startNode}-${i}`, target: `doi-${startNode}-${i + 1}` });
    }
    return { nodes, edges };
};

const g1 = generateMockGraph(10000, "1");
const g2 = generateMockGraph(10000, "2");
const g3 = generateMockGraph(10000, "1"); // Overlap

describe("mergeGraphs", () => {
    bench("mergeGraphs optimized", () => {
        mergeGraphs(g1, g2, g3);
    });
});
