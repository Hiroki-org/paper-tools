import { NextRequest, NextResponse } from "next/server";
import { drilldown } from "@paper-tools/drilldown";
import type { DrilldownBody } from "./route.types";

function hasTitle(value: unknown): value is { title: string } {
    return (
        !!value &&
        typeof value === "object" &&
        typeof (value as { title?: unknown }).title === "string" &&
        (value as { title: string }).title.trim().length > 0
    );
}

export async function POST(request: NextRequest) {
    try {
        const payload: unknown = await request.json();
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 },
            );
        }

        const body = payload as DrilldownBody;
        const { seedPapers, depth = 1, maxPerLevel = 10, enrich = false } = body;

        if (!Array.isArray(seedPapers) || seedPapers.length === 0) {
            return NextResponse.json(
                { error: "seedPapers array is required and must not be empty" },
                { status: 400 },
            );
        }
        if (seedPapers.length > 100) {
            return NextResponse.json(
                { error: "seedPapers array must contain 100 papers or fewer" },
                { status: 400 },
            );
        }
        if (!seedPapers.every(hasTitle)) {
            return NextResponse.json(
                { error: "seedPapers must each include a title" },
                { status: 400 },
            );
        }

        const results = await drilldown(seedPapers, depth, maxPerLevel, enrich);
        return NextResponse.json({ results });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
