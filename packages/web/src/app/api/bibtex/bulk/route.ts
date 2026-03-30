import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";
import { RateLimiter } from "@paper-tools/core";
import { deriveBibtexKey, fetchBibtex, formatBibtex } from "@paper-tools/bibtex/lib";

type BulkPaper = { doi?: string; title?: string };

type BulkBody = {
    papers?: BulkPaper[];
    format?: "bibtex" | "biblatex";
    keyFormat?: "default" | "short" | "venue";
};

function parseFormat(value: string | undefined): "bibtex" | "biblatex" {
    return value === "biblatex" ? "biblatex" : "bibtex";
}

function parseKeyFormat(value: string | undefined): "default" | "short" | "venue" {
    if (value === "short" || value === "venue") return value;
    return "default";
}

function normalizeDoi(value?: string): string | undefined {
    if (!value?.trim()) return undefined;
    return value.trim().replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "").trim();
}

export async function POST(request: NextRequest) {
    try {
        const token = getAccessToken(request.cookies);
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = (await request.json()) as BulkBody;
        const papers = Array.isArray(body.papers) ? body.papers : [];
        if (papers.length === 0) {
            return NextResponse.json({ error: "papers は1件以上必要です" }, { status: 400 });
        }

        const format = parseFormat(body.format);
        const keyFormat = parseKeyFormat(body.keyFormat);
        const limiter = new RateLimiter(3, 1000);

        const results: Array<{ index: number; bibtex: string }> = [];
        const errors: Array<{ title?: string; doi?: string; message: string }> = [];

        let cursor = 0;
        const workers = Array.from({ length: 3 }, () => (async () => {
            while (true) {
                const current = cursor;
                cursor += 1;
                if (current >= papers.length) return;

                const paper = papers[current];
                const doi = normalizeDoi(paper.doi);
                const title = paper.title?.trim() || undefined;

                if (!doi && !title) {
                    errors.push({ title: paper.title, doi: paper.doi, message: "doi または title が必要です" });
                    continue;
                }

                await limiter.acquire();
                try {
                    const fetched = await fetchBibtex({ doi, title });
                    if (!fetched) {
                        errors.push({ title: paper.title, doi: paper.doi, message: "BibTeX を取得できませんでした" });
                        continue;
                    }

                    const customKey = deriveBibtexKey(fetched.bibtex, keyFormat);
                    const formatted = formatBibtex(fetched.bibtex, { format, keyFormat, key: customKey });
                    results.push({ index: current, bibtex: formatted.formatted });
                } catch (error) {
                    errors.push({
                        title: paper.title,
                        doi: paper.doi,
                        message: error instanceof Error ? error.message : "Unknown error",
                    });
                }
            }
        })());

        await Promise.all(workers);

        const sorted = results.sort((a, b) => a.index - b.index);
        const bibtex = sorted.map((item) => item.bibtex).join("\n\n");

        return NextResponse.json({
            bibtex,
            count: sorted.length,
            errors,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
