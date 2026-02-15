import type { CitationGraph } from "./graph.js";

/**
 * グラフを JSON 文字列として出力する。
 */
export function toJson(graph: CitationGraph, pretty = true): string {
    return JSON.stringify(graph, null, pretty ? 2 : undefined);
}

/**
 * ノードラベルを安全にエスケープ（DOT 用）
 */
function escapeLabel(text: string): string {
    return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * DOI を DOT / Mermaid 用の識別子に変換
 */
function doiToId(doi: string): string {
    return doi.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * グラフを DOT (Graphviz) 形式で出力する。
 */
export function toDot(graph: CitationGraph): string {
    const lines: string[] = [];
    lines.push("digraph citations {");
    lines.push("    rankdir=LR;");
    lines.push("    node [shape=box, style=rounded];");
    lines.push("");

    for (const node of graph.nodes) {
        const id = doiToId(node.doi);
        const label = node.title ? escapeLabel(node.title) : escapeLabel(node.doi);
        lines.push(`    ${id} [label="${label}"];`);
    }

    lines.push("");

    for (const edge of graph.edges) {
        const srcId = doiToId(edge.source);
        const tgtId = doiToId(edge.target);
        if (edge.creationDate) {
            lines.push(`    ${srcId} -> ${tgtId} [label="${escapeLabel(edge.creationDate)}"];`);
        } else {
            lines.push(`    ${srcId} -> ${tgtId};`);
        }
    }

    lines.push("}");
    return lines.join("\n");
}

/**
 * Mermaid 用にテキストをエスケープ
 * 引用符を #quot; に置換し、括弧・括弧類を HTML エンティティに置換
 */
function escapeMermaid(text: string): string {
    return text
        .replace(/"/g, "#quot;")
        .replace(/\(/g, "&#40;")
        .replace(/\)/g, "&#41;")
        .replace(/\[/g, "&#91;")
        .replace(/\]/g, "&#93;")
        .replace(/\{/g, "&#123;")
        .replace(/\}/g, "&#125;");
}

/**
 * グラフを Mermaid 形式で出力する。
 */
export function toMermaid(graph: CitationGraph): string {
    const lines: string[] = [];
    lines.push("graph LR");

    for (const node of graph.nodes) {
        const id = doiToId(node.doi);
        const label = node.title ? escapeMermaid(node.title) : escapeMermaid(node.doi);
        lines.push(`    ${id}["${label}"]`);
    }

    for (const edge of graph.edges) {
        const srcId = doiToId(edge.source);
        const tgtId = doiToId(edge.target);
        if (edge.creationDate) {
            lines.push(`    ${srcId} -->|"${escapeMermaid(edge.creationDate)}"| ${tgtId}`);
        } else {
            lines.push(`    ${srcId} --> ${tgtId}`);
        }
    }

    return lines.join("\n");
}
