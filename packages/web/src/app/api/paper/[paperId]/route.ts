import { NextRequest, NextResponse } from "next/server";
import { RateLimiter, getPaper } from "@paper-tools/core";
import type { PaperDetail } from "@/types/paper";

export const runtime = "nodejs";

const SEMANTIC_SCHOLAR_FIELDS = [
    "paperId",
    "title",
    "abstract",
    "authors",
    "year",
    "venue",
    "citationCount",
    "influentialCitationCount",
    "externalIds",
    "url",
    "tldr",
    "fieldsOfStudy",
    "publicationDate",
    "journal",
    "referenceCount",
].join(",");

const detailLimiter = new RateLimiter(100, 300000);

type RouteContext = {
    params: { paperId: string };
};

function getStatusCodeFromError(error: unknown): number | null {
    if (!(error instanceof Error)) {
        return null;
    }

    const match = error.message.match(/Semantic Scholar API error:\s*(\d{3})\b/i);
    if (!match?.[1]) {
        return null;
    }

    const status = Number(match[1]);
    return Number.isInteger(status) ? status : null;
}

function toPaperDetail(input: any): PaperDetail {
    const rawFields = Array.isArray(input?.fieldsOfStudy) ? input.fieldsOfStudy : null;
    const fieldsOfStudy = rawFields
        ? rawFields.map((f: unknown) => {
            if (typeof f === "string") {
                return { category: f, source: "unknown" };
            }
            return {
                category: String((f as Record<string, unknown>)?.category ?? "Unknown"),
                source: String((f as Record<string, unknown>)?.source ?? "unknown"),
            };
        })
        : null;

    const corpusRaw = input?.externalIds?.CorpusId;
    const corpusId =
        typeof corpusRaw === "number"
            ? corpusRaw
            : typeof corpusRaw === "string" && /^\d+$/.test(corpusRaw)
                ? Number(corpusRaw)
                : undefined;

    return {
        paperId: String(input?.paperId ?? ""),
        title: String(input?.title ?? "Untitled"),
        abstract: input?.abstract ?? null,
        authors: Array.isArray(input?.authors)
            ? input.authors.map((a: unknown) => ({
                authorId: String((a as Record<string, unknown>)?.authorId ?? ""),
                name: String((a as Record<string, unknown>)?.name ?? "Unknown"),
            }))
            : [],
        year: typeof input?.year === "number" ? input.year : null,
        venue: String(input?.venue ?? ""),
        citationCount: Number(input?.citationCount ?? 0),
        influentialCitationCount: Number(input?.influentialCitationCount ?? 0),
        referenceCount: Number(input?.referenceCount ?? 0),
        externalIds: {
            DOI: input?.externalIds?.DOI,
            ArXiv: input?.externalIds?.ArXiv,
            ACL: input?.externalIds?.ACL,
            DBLP: input?.externalIds?.DBLP,
            CorpusId: corpusId,
        },
        url: String(input?.url ?? `https://www.semanticscholar.org/paper/${input?.paperId ?? ""}`),
        tldr:
            input?.tldr && typeof input.tldr.text === "string"
                ? { model: String(input.tldr.model ?? ""), text: input.tldr.text }
                : null,
        fieldsOfStudy,
        publicationDate: input?.publicationDate ?? null,
        journal:
            input?.journal && typeof input.journal === "object"
                ? {
                    name: String(input.journal.name ?? ""),
                    volume: input.journal.volume ? String(input.journal.volume) : undefined,
                    pages: input.journal.pages ? String(input.journal.pages) : undefined,
                }
                : null,
    };
}

export async function GET(_request: NextRequest, context: RouteContext) {
    const { paperId } = context.params;
    if (!paperId?.trim()) {
        return NextResponse.json({ error: "paperId is required" }, { status: 400 });
    }

    try {
        await detailLimiter.acquire();
        const paper = await getPaper(paperId, SEMANTIC_SCHOLAR_FIELDS);
        const normalized = toPaperDetail(paper);

        if (!normalized.paperId) {
            return NextResponse.json({ error: "Paper not found" }, { status: 404 });
        }

        return NextResponse.json(normalized);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const statusCode = getStatusCodeFromError(error);
        if (statusCode === 404) {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
