import { NextRequest, NextResponse } from "next/server";
import { getPaper, searchPapers } from "@paper-tools/core";

interface ResolveBody {
    doi?: string;
    title?: string;
    s2Id?: string;
}

function normalizeDoi(input: string) {
    return input.replace(/^DOI:/i, "").trim();
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.json();
        if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        const body = rawBody as Record<string, unknown>;
        const doi = typeof body.doi === 'string' ? body.doi.trim() : undefined;
        const title = typeof body.title === 'string' ? body.title.trim() : undefined;
        const s2Id = typeof body.s2Id === 'string' ? body.s2Id.trim() : undefined;

        if (!doi && !title && !s2Id) {
            return NextResponse.json(
                { error: "doi, title, s2Id のいずれか1つが必要です" },
                { status: 400 },
            );
        }

        if (doi) {
            const paper = await getPaper(`DOI:${normalizeDoi(doi)}`);
            if (!paper) {
                return NextResponse.json(
                    { error: "DOI から論文を解決できませんでした" },
                    { status: 404 },
                );
            }
            return NextResponse.json({ paper });
        }

        if (title) {
            const result = await searchPapers(title);
            const paper = result.data?.[0];
            if (!paper) {
                return NextResponse.json(
                    { error: "タイトルから論文を解決できませんでした" },
                    { status: 404 },
                );
            }
            return NextResponse.json({ paper });
        }

        const paper = await getPaper(s2Id!);
        if (!paper) {
            return NextResponse.json(
                { error: "S2 ID から論文を解決できませんでした" },
                { status: 404 },
            );
        }
        return NextResponse.json({ paper });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}