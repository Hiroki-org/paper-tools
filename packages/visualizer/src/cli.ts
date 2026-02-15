#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildCitationGraph, mergeGraphs } from "./graph.js";
import { toJson, toDot, toMermaid } from "./format.js";
import type { Direction, CitationGraph } from "./graph.js";

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
    readFileSync(join(__dirname, "../package.json"), "utf-8")
);
const version = packageJson.version;

/**
 * CLI オプション値として与えられた文字列を正の整数にパースする
 * @param value - パース対象の文字列
 * @returns パースされた正の整数
 * @throws 値が正の整数でない場合は Error をスロー
 */
function parsePositiveInt(value: string): number {
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n) || n <= 0) {
        throw new Error(`正の整数を指定してください: ${value}`);
    }
    return n;
}

type Format = "json" | "dot" | "mermaid";

/**
 * グラフを指定されたフォーマットに変換・出力する
 * @param graph - 変換対象の引用グラフ
 * @param format - 出力フォーマット（"json" | "dot" | "mermaid"）
 * @returns フォーマット済みのグラフ文字列
 * @throws 未知のフォーマットが指定された場合は Error をスロー
 */
function formatGraph(graph: CitationGraph, format: Format): string {
    switch (format) {
        case "json":
            return toJson(graph);
        case "dot":
            return toDot(graph);
        case "mermaid":
            return toMermaid(graph);
        default:
            throw new Error(`Unknown format: ${format}`);
    }
}

/**
 * グラフの処理結果を出力する
 * 出力先ファイルが指定されている場合はファイルに書き込み、
 * そうでない場合は stdout に出力する
 * @param content - 出力するグラフコンテンツ
 * @param outputPath - 出力先ファイルパス（省略時は stdout に出力）
 */
function outputResult(content: string, outputPath?: string): void {
    if (outputPath) {
        writeFileSync(outputPath, content, "utf-8");
        console.log(`結果を ${outputPath} に書き込みました`);
    } else {
        console.log(content);
    }
}

const program = new Command();

program
    .name("paper-visualizer")
    .description("OpenCitations 引用グラフ可視化CLI")
    .version(version);

program
    .command("graph")
    .description("指定DOIの引用グラフを構築・出力する")
    .argument("<doi>", "起点のDOI")
    .option("--depth <n>", "探索の深さ", parsePositiveInt, 1)
    .option("--direction <dir>", "引用方向", "both")
    .option("--format <fmt>", "出力形式", "json")
    .option("-o, --output <path>", "出力先ファイルパス")
    .action(async (doi: string, opts: { depth: number; direction: string; format: string; output?: string }) => {
        try {
            if (!["citing", "cited", "both"].includes(opts.direction)) {
                throw new Error(`Invalid direction: ${opts.direction}. Must be one of: citing, cited, both`);
            }
            if (!["json", "dot", "mermaid"].includes(opts.format)) {
                throw new Error(`Invalid format: ${opts.format}. Must be one of: json, dot, mermaid`);
            }
            const graph = await buildCitationGraph(doi, opts.depth, opts.direction as Direction);
            const content = formatGraph(graph, opts.format as Format);
            outputResult(content, opts.output);
        } catch (error) {
            console.error("エラー:", error);
            process.exit(1);
        }
    });

program
    .command("multi")
    .description("複数DOIの引用グラフをマージして出力する")
    .argument("<dois...>", "DOI のリスト（スペース区切り）")
    .option("--depth <n>", "探索の深さ", parsePositiveInt, 1)
    .option("--direction <dir>", "引用方向", "both")
    .option("--format <fmt>", "出力形式", "json")
    .option("-o, --output <path>", "出力先ファイルパス")
    .action(async (dois: string[], opts: { depth: number; direction: string; format: string; output?: string }) => {
        try {
            if (!["citing", "cited", "both"].includes(opts.direction)) {
                throw new Error(`Invalid direction: ${opts.direction}. Must be one of: citing, cited, both`);
            }
            if (!["json", "dot", "mermaid"].includes(opts.format)) {
                throw new Error(`Invalid format: ${opts.format}. Must be one of: json, dot, mermaid`);
            }
            const graphs: CitationGraph[] = [];
            for (const doi of dois) {
                const graph = await buildCitationGraph(doi, opts.depth, opts.direction as Direction);
                graphs.push(graph);
            }
            const merged = mergeGraphs(...graphs);
            const content = formatGraph(merged, opts.format as Format);
            outputResult(content, opts.output);
        } catch (error) {
            console.error("エラー:", error);
            process.exit(1);
        }
    });

program.parse();
