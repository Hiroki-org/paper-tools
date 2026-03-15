import { NextRequest, NextResponse } from "next/server";
import { searchAuthors } from "@paper-tools/core";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const rawLimit = Number(searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(20, rawLimit)) : 10;

    if (!q) {
        return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
    }

    try {
        const res = await searchAuthors(q, { limit });
        return NextResponse.json({
            total: res.total,
            candidates: (res.data ?? []).map((c) => ({
                authorId: c.authorId,
                name: c.name,
                affiliations: c.affiliations ?? [],
                paperCount: c.paperCount ?? 0,
                citationCount: c.citationCount ?? 0,
                hIndex: c.hIndex ?? 0,
            })),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
