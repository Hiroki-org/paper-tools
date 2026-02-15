import { NextRequest, NextResponse } from "next/server";
import { searchByKeyword } from "@paper-tools/drilldown";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const maxResults = Number(searchParams.get("maxResults") ?? "30");

    if (!q) {
        return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
    }

    try {
        const papers = await searchByKeyword(q, maxResults);
        return NextResponse.json({ papers, total: papers.length });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
