#!/usr/bin/env node
import { parsePositiveInt } from "@paper-tools/core";
import "dotenv/config";
import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildCitationGraph, mergeGraphs } from "./graph.js";
import { formatGraph, type Format, SUPPORTED_FORMATS } from "./format.js";
import type { Direction, CitationGraph } from "./graph.js";

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
    readFileSync(join(__dirname, "../package.json"), "utf-8")
);
const version = packageJson.version;

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
            if (!(SUPPORTED_FORMATS as readonly string[]).includes(opts.format)) {
                throw new Error(`Invalid format: ${opts.format}. Must be one of: ${SUPPORTED_FORMATS.join(", ")}`);
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
            if (!(SUPPORTED_FORMATS as readonly string[]).includes(opts.format)) {
                throw new Error(`Invalid format: ${opts.format}. Must be one of: ${SUPPORTED_FORMATS.join(", ")}`);
            }
            const graphs = await Promise.all(
                dois.map(doi => buildCitationGraph(doi, opts.depth, opts.direction as Direction))
            );

            // Ensure all graphs were built successfully
            if (graphs.some(g => !g || !g.nodes)) {
                throw new Error("一部のグラフの構築に失敗しました。");
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
