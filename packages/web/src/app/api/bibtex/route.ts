import { NextRequest, NextResponse } from "next/server";
import { normalizeDoi } from "@paper-tools/core";
import { deriveBibtexKey, fetchBibtex, formatBibtex } from "@paper-tools/bibtex/lib";
import { getAccessToken } from "@/lib/auth";

function parseFormat(value: string | null): "bibtex" | "biblatex" {
    return value === "biblatex" ? "biblatex" : "bibtex";
}

function parseKeyFormat(value: string | null): "default" | "short" | "venue" {
    if (value === "short" || value === "venue") return value;
    return "default";
}


export async function GET(request: NextRequest) {
    const accessToken = getAccessToken(request.cookies);
    if (!accessToken) {
        return NextResponse.json({ error: "[bibtex-api] Operation failed: Unauthorized request to /api/bibtex" }, { status: 401 });
    }

    try {
        const doi = normalizeDoi(request.nextUrl.searchParams.get("doi") ?? undefined);
        const title = request.nextUrl.searchParams.get("title")?.trim() || undefined;
        const format = parseFormat(request.nextUrl.searchParams.get("format"));
        const keyFormat = parseKeyFormat(request.nextUrl.searchParams.get("keyFormat"));

        if (!doi && !title) {
            return NextResponse.json({ error: "doi または title のいずれかが必要です" }, { status: 400 });
        }

        const fetched = await fetchBibtex({ doi, title });
        if (!fetched) {
            return NextResponse.json({ error: "BibTeX を取得できませんでした" }, { status: 404 });
        }

        const customKey = deriveBibtexKey(fetched.bibtex, keyFormat);
        const formatted = formatBibtex(fetched.bibtex, {
            format,
            keyFormat,
            key: customKey,
        });

        return NextResponse.json({
            bibtex: formatted.formatted,
            source: fetched.source,
            warnings: formatted.warnings,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
