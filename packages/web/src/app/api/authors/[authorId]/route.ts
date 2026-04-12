import { NextRequest, NextResponse } from "next/server";
import { buildAuthorProfile } from "@paper-tools/author-profiler";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ authorId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
    const { authorId: rawAuthorId } = await context.params;
    const authorId = rawAuthorId?.trim();
    if (!authorId) {
        return NextResponse.json({ error: "authorId is required" }, { status: 400 });
    }

    try {
        const profile = await buildAuthorProfile(authorId);
        return NextResponse.json(profile);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const status = /Semantic Scholar API error:\s*404\b/.test(message) ? 404 : 502;
        return NextResponse.json({ error: message }, { status });
    }
}
