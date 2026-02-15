#!/usr/bin/env node

import { Command } from "commander";
import { scrapeConference, scrapeAcceptedPapers } from "./researchr-scraper.js";
import { enrichWithDblp, searchConferencePapers } from "./dblp-integration.js";

const program = new Command();

function parsePositiveInt(value: string, optionName: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
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
    .name("paper-scraper")
    .description("Conference paper scraper: conf.researchr.org + DBLP")
    .version("0.1.0");

program
    .command("scrape")
    .description("conf.researchr.org からカンファレンス情報を取得")
    .argument("<slug>", "カンファレンスのスラッグ (例: icse-2026)")
    .option("--dblp <venue>", "DBLP からの論文情報で補完 (ベニュー名)")
    .option("--max-papers <n>", "DBLP から取得する最大論文数", "100")
    .option("-o, --output <file>", "出力JSONファイルパス")
    .action(async (slug: string, options: { dblp?: string; maxPapers?: string; output?: string }) => {
        try {
            console.error(`Scraping conf.researchr.org for: ${slug}`);
            let conference = await scrapeConference(slug);

            if (options.dblp) {
                console.error(`Enriching with DBLP data for venue: ${options.dblp}`);
                const maxPapers = parsePositiveInt(options.maxPapers || "100", "--max-papers");
                conference = await enrichWithDblp(conference, options.dblp, maxPapers);
            }

            await outputJson(conference, options.output);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command("papers")
    .description("DBLP からカンファレンス論文を検索")
    .argument("<venue>", "ベニュー名 (例: ICSE)")
    .option("-y, --year <year>", "年を指定")
    .option("-n, --max <n>", "最大取得件数", "100")
    .option("-o, --output <file>", "出力JSONファイルパス")
    .action(async (venue: string, options: { year?: string; max?: string; output?: string }) => {
        try {
            console.error(`Searching DBLP for venue: ${venue}`);
            const year = options.year ? parsePositiveInt(options.year, "--year") : undefined;
            const max = parsePositiveInt(options.max || "100", "--max");

            const papers = await searchConferencePapers(venue, year, max);
            await outputJson(papers, options.output);

            console.error(`Found ${papers.length} papers`);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command("accepted")
    .description("conf.researchr.org のトラックページからAccepted Papersを取得")
    .argument("<url>", "トラックページのURL")
    .option("-o, --output <file>", "出力JSONファイルパス")
    .action(async (url: string, options: { output?: string }) => {
        try {
            console.error(`Scraping accepted papers from: ${url}`);
            const papers = await scrapeAcceptedPapers(url);
            await outputJson(papers, options.output);

            console.error(`Found ${papers.length} papers`);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program.parse();
