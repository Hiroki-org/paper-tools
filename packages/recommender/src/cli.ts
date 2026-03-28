#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import {
    createPaperPage,
    findDuplicates,
    getDatabase,
    queryPapers,
    type DatabaseValidationResult,
    type DuplicateResult,
} from "./notion-client.js";
import {
    recommendFromMultiple,
    recommendFromSingle,
} from "./recommend.js";
import type { S2Paper } from "@paper-tools/core";
import { parsePositiveInt } from "@paper-tools/core";

const program = new Command();


async function syncPapers(
    databaseId: string,
    papers: S2Paper[],
    duplicates: DuplicateResult,
    dryRun: boolean,
    validation: DatabaseValidationResult,
): Promise<{ added: number; skipped: number; errors: number }> {
    let added = 0;
    let skipped = 0;
    let errors = 0;

    const toProcess: S2Paper[] = [];
    for (const paper of papers) {
        const doi = paper.externalIds?.DOI;
        const titleKey = (paper.title ?? "").trim().toLowerCase();
        const isDuplicate = (doi && duplicates.duplicateDois.has(doi))
            || (titleKey && duplicates.duplicateTitles.has(titleKey));

        if (isDuplicate) {
            skipped++;
        } else {
            toProcess.push(paper);
        }
    }

    if (dryRun) {
        added = toProcess.length;
        return { added, skipped, errors };
    }

    const CONCURRENCY = 5;
    let cursor = 0;

    const workerCount = Math.max(1, Math.min(toProcess.length, Math.floor(CONCURRENCY)));
    const workers = Array.from({ length: workerCount }, async () => {
        while (true) {
            const current = cursor++;
            if (current >= toProcess.length) {
                return;
            }

            const paper = toProcess[current];
            try {
                await createPaperPage(databaseId, paper, undefined, validation);
                added++;
            } catch (err) {
                const doi = paper?.externalIds?.DOI;
                const id = doi || paper?.title || paper?.paperId;
                console.error(`Failed to add paper ${id}:`, err instanceof Error ? err.message : err);
                errors++;
            }
        }
    });

    await Promise.all(workers);

    return { added, skipped, errors };
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
            const { added, skipped, errors } = await syncPapers(
                databaseId,
                papers,
                duplicates,
                dryRun,
                database,
            );

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
            const { added, skipped, errors } = await syncPapers(
                databaseId,
                recommended,
                duplicates,
                dryRun,
                database,
            );

            console.log(JSON.stringify({ input: positiveIds.length, added, skipped, errors, dryRun }, null, 2));
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program.parse();