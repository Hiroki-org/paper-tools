#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { runProfileCommand } from "./commands/profile.js";
import { runPapersCommand } from "./commands/papers.js";
import { runCoauthorsCommand } from "./commands/coauthors.js";
import { runSaveCommand } from "./commands/save.js";

const program = new Command();

program
    .name("paper-author")
    .description("Author profiler CLI")
    .version("0.1.0");

program
    .command("profile")
    .argument("<name-or-id>", "author name or Semantic Scholar Author ID")
    .option("--id", "treat input as Semantic Scholar Author ID", false)
    .option("--json", "output full JSON", false)
    .action(async (nameOrId: string, options: { id?: boolean; json?: boolean }) => {
        try {
            await runProfileCommand(nameOrId, options);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command("papers")
    .argument("<name-or-id>", "author name or Semantic Scholar Author ID")
    .option("--id", "treat input as Semantic Scholar Author ID", false)
    .option("--top <n>", "show top N papers by citation", "10")
    .action(async (nameOrId: string, options: { id?: boolean; top?: string }) => {
        try {
            await runPapersCommand(nameOrId, options);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command("coauthors")
    .argument("<name-or-id>", "author name or Semantic Scholar Author ID")
    .option("--id", "treat input as Semantic Scholar Author ID", false)
    .option("--depth <n>", "coauthor traversal depth", "1")
    .action(async (nameOrId: string, options: { id?: boolean; depth?: string }) => {
        try {
            await runCoauthorsCommand(nameOrId, options);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program
    .command("save")
    .argument("<name-or-id>", "author name or Semantic Scholar Author ID")
    .option("--id", "treat input as Semantic Scholar Author ID", false)
    .option("--dry-run", "do not write to Notion", false)
    .action(async (nameOrId: string, options: { id?: boolean; dryRun?: boolean }) => {
        try {
            await runSaveCommand(nameOrId, options);
        } catch (error) {
            console.error("Error:", error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program.parse();
