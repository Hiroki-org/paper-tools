#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { searchByKeyword, searchByVenue, enrichAllWithCrossref, searchCrossref } from "./search.js";
import { drilldown, extractKeywords } from "./drilldown.js";
import type { Paper } from "@paper-tools/core";

const program = new Command();

function parsePositiveInt(value: string, optionName: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${optionName} には正の整数を指定してください: ${value}`);
    }
    return parsed;
}

async function outputJson(data: unknown, output?: string): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    if (output) {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(output, json, "utf-8");
        console.error(`Output written to: ${output}`);
        return;
    }
    console.log(json);
}

program
    .name("paper-drilldown")
    .description("DBLP + Crossref による論文キーワード検索・深掘り CLI")
    .version("0.1.0");

// ── search コマンド ──────────────────────────────────
program
    .command("search")
    .argument("<keyword>", "検索キーワード")
    .option("--limit <n>", "最大取得件数", "30")
    .option("--enrich", "Crossref で情報を補完する", false)
    .option("-o, --output <file>", "出力JSONファイル")
    .action(async (keyword: string, options: { limit?: string; enrich?: boolean; output?: string }) => {
        try {
            const limit = parsePositiveInt(options.limit || "30", "--limit");
            let papers = await searchByKeyword(keyword, limit);
            if (options.enrich) {
                papers = await enrichAllWithCrossref(papers);
            }
            await outputJson(papers, options.output);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// ── venue コマンド ──────────────────────────────────
program
    .command("venue")
    .argument("<venue>", "会議名 / ジャーナル名（例: ICSE, CHI）")
    .option("--year <year>", "発行年で絞り込む")
    .option("--limit <n>", "最大取得件数", "100")
    .option("--enrich", "Crossref で情報を補完する", false)
    .option("-o, --output <file>", "出力JSONファイル")
    .action(async (venue: string, options: { year?: string; limit?: string; enrich?: boolean; output?: string }) => {
        try {
            const limit = parsePositiveInt(options.limit || "100", "--limit");
            const year = options.year ? parsePositiveInt(options.year, "--year") : undefined;
            let papers = await searchByVenue(venue, year, limit);
            if (options.enrich) {
                papers = await enrichAllWithCrossref(papers);
            }
            await outputJson(papers, options.output);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// ── crossref コマンド ──────────────────────────────────
program
    .command("crossref")
    .argument("<query>", "Crossref 検索クエリ")
    .option("--limit <n>", "最大取得件数", "20")
    .option("-o, --output <file>", "出力JSONファイル")
    .action(async (query: string, options: { limit?: string; output?: string }) => {
        try {
            const limit = parsePositiveInt(options.limit || "20", "--limit");
            const papers = await searchCrossref(query, limit);
            await outputJson(papers, options.output);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// ── drilldown コマンド ──────────────────────────────────
program
    .command("drilldown")
    .argument("<keyword>", "シード検索キーワード")
    .option("--seed-limit <n>", "シード論文の最大取得件数", "10")
    .option("--depth <n>", "深掘りの深さ", "1")
    .option("--max-per-level <n>", "各レベルの最大取得件数", "10")
    .option("--enrich", "Crossref で情報を補完する", false)
    .option("-o, --output <file>", "出力JSONファイル")
    .action(async (keyword: string, options: {
        seedLimit?: string;
        depth?: string;
        maxPerLevel?: string;
        enrich?: boolean;
        output?: string;
    }) => {
        try {
            const seedLimit = parsePositiveInt(options.seedLimit || "10", "--seed-limit");
            const depth = parsePositiveInt(options.depth || "1", "--depth");
            const maxPerLevel = parsePositiveInt(options.maxPerLevel || "10", "--max-per-level");
            const enrich = options.enrich ?? false;

            const seedPapers = await searchByKeyword(keyword, seedLimit);
            if (seedPapers.length === 0) {
                console.error("シード検索結果が 0 件です");
                process.exit(1);
            }

            const results = await drilldown(seedPapers, depth, maxPerLevel, enrich);
            await outputJson(results, options.output);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// ── keywords コマンド ──────────────────────────────────
program
    .command("keywords")
    .argument("<keyword>", "検索キーワード")
    .option("--limit <n>", "検索で取得する論文数", "20")
    .option("--top <n>", "出力するキーワード数", "10")
    .option("-o, --output <file>", "出力JSONファイル")
    .action(async (keyword: string, options: { limit?: string; top?: string; output?: string }) => {
        try {
            const limit = parsePositiveInt(options.limit || "20", "--limit");
            const topN = parsePositiveInt(options.top || "10", "--top");

            const papers = await searchByKeyword(keyword, limit);
            if (papers.length === 0) {
                console.error("検索結果が 0 件です");
                process.exit(1);
            }

            const keywords = extractKeywords(papers, topN);
            await outputJson({ query: keyword, papersAnalyzed: papers.length, keywords }, options.output);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program.parse();
