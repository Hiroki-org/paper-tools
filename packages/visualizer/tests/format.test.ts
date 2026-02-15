import { describe, it, expect } from "vitest";
import type { CitationGraph } from "../src/graph.js";
import { toJson, toDot, toMermaid } from "../src/format.js";

const sampleGraph: CitationGraph = {
    nodes: [
        { doi: "10.1234/a", title: "Paper A" },
        { doi: "10.5678/b", title: "Paper B" },
        { doi: "10.9999/c" },
    ],
    edges: [
        { source: "10.1234/a", target: "10.5678/b", creationDate: "2024-01-01" },
        { source: "10.5678/b", target: "10.9999/c" },
    ],
};

describe("toJson", () => {
    it("should output valid JSON with all nodes and edges", () => {
        const json = toJson(sampleGraph);
        const parsed = JSON.parse(json) as CitationGraph;
        expect(parsed.nodes).toHaveLength(3);
        expect(parsed.edges).toHaveLength(2);
        expect(parsed.nodes[0].doi).toBe("10.1234/a");
    });

    it("should output compact JSON when pretty=false", () => {
        const compact = toJson(sampleGraph, false);
        expect(compact).not.toContain("\n");
    });

    it("should output pretty JSON by default", () => {
        const pretty = toJson(sampleGraph);
        expect(pretty).toContain("\n");
    });
});

describe("toDot", () => {
    it("should produce a valid DOT digraph", () => {
        const dot = toDot(sampleGraph);
        expect(dot).toContain("digraph citations {");
        expect(dot).toContain("rankdir=LR;");
        expect(dot).toContain("}");
    });

    it("should include node declarations with labels", () => {
        const dot = toDot(sampleGraph);
        expect(dot).toContain('label="Paper A"');
        expect(dot).toContain('label="Paper B"');
        // ノード c にはタイトルがないので DOI がラベルになる
        expect(dot).toContain('label="10.9999/c"');
    });

    it("should include edge declarations", () => {
        const dot = toDot(sampleGraph);
        expect(dot).toContain("->");
        // creationDate 付きエッジにはラベルが付く
        expect(dot).toContain('label="2024-01-01"');
    });

    it("should escape special characters in labels", () => {
        const graph: CitationGraph = {
            nodes: [{ doi: "10.1/x", title: 'Title with "quotes"' }],
            edges: [],
        };
        const dot = toDot(graph);
        expect(dot).toContain('Title with \\"quotes\\"');
    });
});

describe("toMermaid", () => {
    it("should produce a Mermaid flowchart", () => {
        const mermaid = toMermaid(sampleGraph);
        expect(mermaid).toContain("graph LR");
    });

    it("should include node definitions with labels", () => {
        const mermaid = toMermaid(sampleGraph);
        expect(mermaid).toContain('["Paper A"]');
        expect(mermaid).toContain('["Paper B"]');
    });

    it("should include edge definitions", () => {
        const mermaid = toMermaid(sampleGraph);
        expect(mermaid).toContain("-->");
        // creationDate 付きエッジにはラベルが付く
        expect(mermaid).toContain("|");
    });

    it("should escape quotes in Mermaid labels", () => {
        const graph: CitationGraph = {
            nodes: [{ doi: "10.1/x", title: 'A "quoted" title' }],
            edges: [],
        };
        const mermaid = toMermaid(graph);
        expect(mermaid).toContain("#quot;");
        expect(mermaid).not.toContain('"quoted"');
    });
});
