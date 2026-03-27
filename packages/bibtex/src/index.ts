#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { stdin as input, stdout as output } from "node:process";
import { fetchBibtex } from "./bibtex-fetcher.js";
import { deriveBibtexKey, formatBibtex, getValidationWarnings, parseBibtexEntry, splitBibtexEntries } from "./bibtex-formatter.js";
import type { BibtexFormat, BibtexKeyFormat, ValidateIssue } from "./types.js";
import { queryPapers } from "@paper-tools/recommender";

const program = new Command();

function requireDatabaseId(): string {
    const databaseId = process.env["NOTION_DATABASE_ID"];
    if (!databaseId) {
        throw new Error("NOTION_DATABASE_ID が未設定です");
    }
    return databaseId;
}

function looksLikeDoi(inputValue: string): boolean {
    const s = inputValue.trim();
    return /^10\.[^\s/]+\/.+/i.test(s) || /^https?:\/\/doi\.org\//i.test(s) || /^doi:/i.test(s);
}

function normalizeDoi(inputValue: string): string {
    return inputValue.trim().replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "").trim();
}

function parseKeyFormat(value: string | undefined): BibtexKeyFormat {
    if (value === "short" || value === "venue") return value;
    return "default";
}

function parseFormat(value: string | undefined): BibtexFormat {
    if (value === "biblatex") return "biblatex";
    return "bibtex";
}

function deriveCustomKey(rawBibtex: string, keyFormat: BibtexKeyFormat): string | undefined {
    return deriveBibtexKey(rawBibtex, keyFormat);
}

async function readStdinText(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of input) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8");
}

function buildValidateReport(entries: string[]): { issues: ValidateIssue[]; total: number } {
    const issues: ValidateIssue[] = [];
    const keySeen = new Map<string, number>();
    const doiSeen = new Map<string, number>();

    entries.forEach((raw, index) => {
        try {
            const parsed = parseBibtexEntry(raw);
            const key = parsed.key;
            const doi = (parsed.fields.doi ?? "").trim().toLowerCase();

            for (const warning of getValidationWarnings(parsed)) {
                issues.push({ level: "warning", message: warning, key });
            }

            if (key) {
                keySeen.set(key, (keySeen.get(key) ?? 0) + 1);
            }
            if (doi) {
                doiSeen.set(doi, (doiSeen.get(doi) ?? 0) + 1);
            }
        } catch (error) {
            issues.push({
                level: "error",
                message: `Entry ${index + 1} parse failed: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
    });

    for (const [key, count] of keySeen) {
        if (count > 1) {
            issues.push({ level: "error", key, message: `Duplicate key detected: ${key} (${count})` });
        }
    }
    for (const [doi, count] of doiSeen) {
        if (count > 1) {
            issues.push({ level: "error", message: `Duplicate DOI detected: ${doi} (${count})` });
        }
    }

    return { issues, total: entries.length };
}

program
    .name("paper-bib")
    .description("Generate and validate BibTeX entries from DOI/title and Notion DB records")
    .version("0.1.0");

program
    .command("get")
    .argument("<identifier>", "DOI or paper title")
    .option("--format <format>", "bibtex|biblatex", "bibtex")
    .option("--key-format <keyFormat>", "default|short|venue", "default")
    .action(async (identifier: string, options: { format?: string; keyFormat?: string }) => {
        try {
            const format = parseFormat(options.format);
            const keyFormat = parseKeyFormat(options.keyFormat);
            const lookup = looksLikeDoi(identifier)
                ? { doi: normalizeDoi(identifier) }
                : { title: identifier.trim() };

            const result = await fetchBibtex(lookup);
            if (!result) {
                throw new Error("BibTeX を取得できませんでした");
            }

            const customKey = deriveCustomKey(result.bibtex, keyFormat);
            const formatted = formatBibtex(result.bibtex, {
                format,
                key: customKey,
                keyFormat,
            });
            if (formatted.warnings.length > 0) {
                for (const warning of formatted.warnings) {
                    console.error(`Warning: ${warning}`);
                }
            }
            output.write(`${formatted.formatted}\n`);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command("export")
    .option("--tag <tag>", "Tag filter (best-effort)")
    .option("--format <format>", "bibtex|biblatex", "bibtex")
    .option("--key-format <keyFormat>", "default|short|venue", "default")
    .option("--output <file>", "Output file path")
    .action(async (options: { tag?: string; format?: string; keyFormat?: string; output?: string }) => {
        try {
            const databaseId = requireDatabaseId();
            const format = parseFormat(options.format);
            const keyFormat = parseKeyFormat(options.keyFormat);

            const records = await queryPapers(databaseId);
            let targets = records;

            if (options.tag) {
                // recommender notion-client currently does not expose tag fields.
                // We keep this as a best-effort title filter to avoid blocking the export flow.
                targets = records.filter((r) => r.title.toLowerCase().includes(options.tag!.toLowerCase()));
                console.error(`Warning: --tag はタイトル文字列ベースの簡易フィルタです (${targets.length}/${records.length})`);
            }

            const results: (string | null)[] = [];
            const BATCH_SIZE = 10;
            for (let i = 0; i < targets.length; i += BATCH_SIZE) {
                const batch = targets.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(
                    batch.map(async (record) => {
                        const fetched = await fetchBibtex({ doi: record.doi, title: record.title });
                        if (!fetched) {
                            console.error(`Warning: BibTeX取得失敗: ${record.title}`);
                            return null;
                        }

                        const customKey = deriveCustomKey(fetched.bibtex, keyFormat);
                        const formatted = formatBibtex(fetched.bibtex, {
                            format,
                            key: customKey,
                            keyFormat,
                        });

                        if (formatted.warnings.length > 0) {
                            console.error(`Warning (${record.title}): ${formatted.warnings.join("; ")}`);
                        }
                        return formatted.formatted;
                    })
                );
                results.push(...batchResults);
            }
            const chunks = results.filter((c): c is string => c !== null);

            const outputText = chunks.join("\n\n");
            if (options.output) {
                await writeFile(options.output, outputText, "utf8");
                console.error(`Wrote ${chunks.length} entries to ${options.output}`);
            } else {
                output.write(outputText + (outputText ? "\n" : ""));
            }
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command("validate")
    .argument("<input>", "BibTeX file path, or '-' to read stdin")
    .action(async (inputArg: string) => {
        try {
            const text = inputArg === "-"
                ? await readStdinText()
                : await readFile(inputArg, "utf8");

            const entries = splitBibtexEntries(text);
            if (entries.length === 0) {
                console.log("No BibTeX entries found.");
                return;
            }

            const report = buildValidateReport(entries);
            const errors = report.issues.filter((i) => i.level === "error");
            const warnings = report.issues.filter((i) => i.level === "warning");

            console.log(`Entries: ${report.total}`);
            console.log(`Errors: ${errors.length}`);
            console.log(`Warnings: ${warnings.length}`);

            for (const issue of report.issues) {
                const prefix = issue.level.toUpperCase();
                const keyInfo = issue.key ? ` [${issue.key}]` : "";
                console.log(`${prefix}${keyInfo}: ${issue.message}`);
            }

            if (errors.length > 0) {
                process.exit(1);
            }
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program.parse();
