import type { CitationGraph } from "./graph.js";

export const SUPPORTED_FORMATS = ["json", "dot", "mermaid"] as const;
export type Format = (typeof SUPPORTED_FORMATS)[number];

/**
 * グラフを指定されたフォーマットに変換・出力する
 * @param graph - 変換対象の引用グラフ
 * @param format - 出力フォーマット
 * @param pretty - JSON 出力時に整形するかどうか (デフォルト: true)
 * @returns フォーマット済みのグラフ文字列
 */
export function formatGraph(graph: CitationGraph, format: Format, pretty = true): string {
    switch (format) {
        case "json":
            return toJson(graph, pretty);
        case "dot":
            return toDot(graph);
        case "mermaid":
            return toMermaid(graph);
        default:
            throw new Error(`Unknown format: ${format}. Supported formats are: ${SUPPORTED_FORMATS.join(", ")}`);
    }
}

/**
 * グラフを JSON 文字列として出力する。
 */
function toJson(graph: CitationGraph, pretty = true): string {
    return JSON.stringify(graph, null, pretty ? 2 : undefined);
}

/**
 * ノードラベルを安全にエスケープして DOT 形式用に準備する
 * バックスラッシュと二重引用符をエスケープして DOT グラフの引用符内で安全に使用できにする
 * @param text - エスケープ対象のテキスト
 * @returns DOT 形式用にエスケープされたテキスト
 */
function escapeLabel(text: string): string {
    return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * DOI を DOT / Mermaid 図形式用の有効な識別子に変換する
 * すべての英数字以外の文字をアンダースコアに置換してグラフノード ID として使用できるようにする
 * @param doi - 変換対象の DOI
 * @returns グラフノード ID として使用可能な文字列
 */
function doiToId(doi: string): string {
    return doi.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * グラフを DOT (Graphviz) 形式で出力する。
 * DOI由来のノード ID は Graphviz パーサーの互換性のため、引用符で囲んで出力する
 */
function toDot(graph: CitationGraph): string {
    const lines: string[] = [];
    lines.push("digraph citations {");
    lines.push("    rankdir=LR;");
    lines.push("    node [shape=box, style=rounded];");
    lines.push("");

    for (const node of graph.nodes) {
        const id = doiToId(node.doi);
        const label = node.title ? escapeLabel(node.title) : escapeLabel(node.doi);
        lines.push(`    "${id}" [label="${label}"];`);
    }

    lines.push("");

    for (const edge of graph.edges) {
        const srcId = doiToId(edge.source);
        const tgtId = doiToId(edge.target);
        if (edge.creationDate) {
            lines.push(`    "${srcId}" -> "${tgtId}" [label="${escapeLabel(edge.creationDate)}"];`);
        } else {
            lines.push(`    "${srcId}" -> "${tgtId}";`);
        }
    }

    lines.push("}");
    return lines.join("\n");
}

/**
 * Mermaid ダイアグラム形式用にテキストをエスケープする
 * すべての特殊文字を HTML 数値エンティティに置換して
 * Mermaid グラフノードのラベルとして正しく表示されるようにする
 * @param text - エスケープ対象のテキスト
 * @returns Mermaid 形式用にエスケープされたテキスト
 */
function escapeMermaid(text: string): string {
    return text
        .replace(/"/g, "&#34;")
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
function toMermaid(graph: CitationGraph): string {
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
