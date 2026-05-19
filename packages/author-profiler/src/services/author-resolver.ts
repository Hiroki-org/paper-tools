import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import prompts from "prompts";
import { getAuthor, searchAuthors } from "@paper-tools/core";

export interface AuthorResolution {
    authorId: string;
    name: string;
}

export interface ResolveAuthorOptions {
    id?: boolean;
    limit?: number;
    interactive?: boolean;
}

type ResolverCache = Record<string, AuthorResolution>;

const CACHE_DIR = join(homedir(), ".paper-tools", "author-profiler");
const CACHE_FILE = join(CACHE_DIR, "resolver-cache.json");

export function looksLikeAuthorId(input: string): boolean {
    return /^\d+$/.test(input.trim());
}

async function readCache(): Promise<ResolverCache> {
    try {
        const raw = await readFile(CACHE_FILE, "utf-8");
        return JSON.parse(raw) as ResolverCache;
    } catch {
        return {};
    }
}

async function writeCache(cache: ResolverCache): Promise<void> {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

export async function resolveAuthorId(
    input: string,
    options: ResolveAuthorOptions = {},
): Promise<AuthorResolution> {
    const query = input.trim();
    if (!query) {
        throw new Error("著者名またはAuthor IDを指定してください");
    }

    const cache = await readCache();
    const cacheKey = query.toLowerCase();
    if (cache[cacheKey]) {
        return cache[cacheKey];
    }

    if (options.id || looksLikeAuthorId(query)) {
        const author = await getAuthor(query, ["authorId", "name"]);
        if (!author.authorId) {
            throw new Error(`Author not found: ${query}`);
        }
        const resolved = { authorId: author.authorId, name: author.name };
        cache[cacheKey] = resolved;
        await writeCache(cache);
        return resolved;
    }

    const response = await searchAuthors(query, { limit: options.limit ?? 10 });
    const candidates = response.data ?? [];

    if (candidates.length === 0) {
        throw new Error(`著者が見つかりませんでした: ${query}`);
    }

    if (candidates.length === 1) {
        const only = candidates[0]!;
        const resolved = {
            authorId: only.authorId ?? "",
            name: only.name,
        };
        if (!resolved.authorId) {
            throw new Error("著者IDが取得できませんでした");
        }
        cache[cacheKey] = resolved;
        await writeCache(cache);
        return resolved;
    }

    let selected = candidates[0]!;
    if (options.interactive ?? true) {
        const answer = await prompts({
            type: "select",
            name: "authorId",
            message: "著者候補を選択してください",
            choices: candidates.map((c) => ({
                title: `${c.name} | h-index:${c.hIndex ?? "?"} | papers:${c.paperCount ?? "?"} | ${(c.affiliations ?? []).join(", ")}`,
                value: c.authorId,
            })),
        });

        const selectedId = String(answer.authorId ?? "");
        if (!selectedId) {
            throw new Error("著者選択がキャンセルされました");
        }
        selected = candidates.find((c) => c.authorId === selectedId) ?? selected;
    }

    if (!selected.authorId) {
        throw new Error("著者IDが取得できませんでした");
    }

    const resolved = {
        authorId: selected.authorId,
        name: selected.name,
    };
    cache[cacheKey] = resolved;
    await writeCache(cache);
    return resolved;
}
