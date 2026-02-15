#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { buildCitationGraph, mergeGraphs } from "./graph.js";
import { toJson, toDot, toMermaid } from "./format.js";
import type { Direction, CitationGraph } from "./graph.js";

function parsePositiveInt(value: string): number {
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n) || n <= 0) {
        throw new Error(`正の整数を指定してください: ${value}`);
    }
    return n;
}

type Format = "json" | "dot" | "mermaid";

function formatGraph(graph: CitationGraph, format: Format): string {
    switch (format) {
        case "json":
            return toJson(graph);
        case "dot":
            return toDot(graph);
        case "mermaid":
            return toMermaid(graph);
    }
}

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
    .version("0.1.0");

program
    .command("graph")
    .description("指定DOIの引用グラフを構築・出力する")
    .argument("<doi>", "起点のDOI")
    .option("--depth <n>", "探索の深さ", parsePositiveInt, 1)
    .option("--direction <dir>", "引用方向 (citing|cited|both)", "both")
    .option("--format <fmt>", "出力形式 (json|dot|mermaid)", "json")
    .option("-o, --output <path>", "出力先ファイルパス")
    .action(async (doi: string, opts: { depth: number; direction: string; format: string; output?: string }) => {
        try {
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
    .option("--direction <dir>", "引用方向 (citing|cited|both)", "both")
    .option("--format <fmt>", "出力形式 (json|dot|mermaid)", "json")
    .option("-o, --output <path>", "出力先ファイルパス")
    .action(async (dois: string[], opts: { depth: number; direction: string; format: string; output?: string }) => {
        try {
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
