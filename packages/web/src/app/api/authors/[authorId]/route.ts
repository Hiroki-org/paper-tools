import { NextRequest, NextResponse } from "next/server";
import { buildAuthorProfile } from "@paper-tools/author-profiler";

export const runtime = "nodejs";

type RouteContext = {
    params: { authorId: string };
};

export async function GET(_request: NextRequest, context: RouteContext) {
    const authorId = context.params.authorId?.trim();
    if (!authorId) {
        return NextResponse.json({ error: "authorId is required" }, { status: 400 });
    }

    try {
        const profile = await buildAuthorProfile(authorId);
        return NextResponse.json(profile);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const status = /404/.test(message) ? 404 : 502;
        return NextResponse.json({ error: message }, { status });
    }
}
