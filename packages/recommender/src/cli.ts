#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import {
    createPaperPage,
    findDuplicates,
    getDatabase,
    queryPapers,
} from "./notion-client.js";
import {
    recommendFromMultiple,
    recommendFromSingle,
} from "./recommend.js";

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

function requireDatabaseId(): string {
    const databaseId = process.env["NOTION_DATABASE_ID"];
    if (!databaseId) {
        throw new Error("NOTION_DATABASE_ID が未設定です");
    }
    return databaseId;
}

program
    .name("paper-recommender")
    .description("Semantic Scholar + Notion による論文レコメンドCLI")
    .version("0.1.0");

program
    .command("recommend")
    .argument("<paper-id>", "DOI / Semantic Scholar ID / タイトル")
    .option("--limit <n>", "レコメンド件数", "10")
    .option("--from <pool>", "recent | all-cs", "recent")
    .option("-o, --output <file>", "出力JSONファイル")
    .action(async (paperId: string, options: { limit?: string; from?: string; output?: string }) => {
        try {
            const limit = parsePositiveInt(options.limit || "10", "--limit");
            const from = (options.from === "all-cs" ? "all-cs" : "recent") as "recent" | "all-cs";
            const papers = await recommendFromSingle(paperId, { limit, from });
            await outputJson(papers, options.output);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command("sync")
    .argument("<paper-id>", "DOI / Semantic Scholar ID / タイトル")
    .option("--limit <n>", "レコメンド件数", "10")
    .option("--dry-run", "追加せずに結果のみ表示", false)
    .action(async (paperId: string, options: { limit?: string; dryRun?: boolean }) => {
        try {
            const databaseId = requireDatabaseId();
            const limit = parsePositiveInt(options.limit || "10", "--limit");
            const dryRun = options.dryRun ?? false;

            const database = await getDatabase(databaseId);
            if (database.missingOptional.length > 0) {
                console.error(`Warning: 任意プロパティ不足: ${database.missingOptional.join(", ")}`);
            }

            const papers = await recommendFromSingle(paperId, { limit, from: "recent" });
            const duplicates = await findDuplicates(databaseId, papers);

            let added = 0;
            let skipped = 0;
            let errors = 0;

            for (const paper of papers) {
                const doi = paper.externalIds?.DOI;
                const titleKey = (paper.title ?? "").trim().toLowerCase();
                const isDuplicate = (doi && duplicates.duplicateDois.has(doi))
                    || (titleKey && duplicates.duplicateTitles.has(titleKey));

                if (isDuplicate) {
                    skipped++;
                    continue;
                }

                if (dryRun) {
                    added++;
                    continue;
                }

                try {
                    await createPaperPage(databaseId, paper);
                    added++;
                } catch {
                    errors++;
                }
            }

            console.log(JSON.stringify({ added, skipped, errors, dryRun }, null, 2));
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command("sync-all")
    .option("--limit <n>", "レコメンド件数", "20")
    .option("--dry-run", "追加せずに結果のみ表示", false)
    .action(async (options: { limit?: string; dryRun?: boolean }) => {
        try {
            const databaseId = requireDatabaseId();
            const limit = parsePositiveInt(options.limit || "20", "--limit");
            const dryRun = options.dryRun ?? false;

            const database = await getDatabase(databaseId);
            if (database.missingOptional.length > 0) {
                console.error(`Warning: 任意プロパティ不足: ${database.missingOptional.join(", ")}`);
            }

            const existingPapers = await queryPapers(databaseId);
            const positiveIds = existingPapers
                .map((p) => p.semanticScholarId || p.doi || p.title)
                .filter((v): v is string => !!v && v.trim().length > 0);

            const recommended = await recommendFromMultiple(positiveIds, [], { limit });
            const duplicates = await findDuplicates(databaseId, recommended);

            let added = 0;
            let skipped = 0;
            let errors = 0;

            for (const paper of recommended) {
                const doi = paper.externalIds?.DOI;
                const titleKey = (paper.title ?? "").trim().toLowerCase();
                const isDuplicate = (doi && duplicates.duplicateDois.has(doi))
                    || (titleKey && duplicates.duplicateTitles.has(titleKey));

                if (isDuplicate) {
                    skipped++;
                    continue;
                }

                if (dryRun) {
                    added++;
                    continue;
                }

                try {
                    await createPaperPage(databaseId, paper);
                    added++;
                } catch {
                    errors++;
                }
            }

            console.log(JSON.stringify({ input: positiveIds.length, added, skipped, errors, dryRun }, null, 2));
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program.parse();