import { NextRequest, NextResponse } from "next/server";
import { searchByKeyword } from "@paper-tools/drilldown";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const parsedMaxResults = Number(searchParams.get("maxResults") ?? "30");
    const maxResults = Number.isFinite(parsedMaxResults)
        ? Math.max(1, Math.min(100, parsedMaxResults))
        : 30;

    if (!q) {
        return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
    }

    try {
        const papers = await searchByKeyword(q, maxResults);
        return NextResponse.json({ papers, total: papers.length });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: `Search backend failed: ${message}` }, { status: 502 });
    }
}
