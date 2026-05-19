import { NextRequest, NextResponse } from "next/server";
import { drilldown } from "@paper-tools/drilldown";
import type { Paper } from "@paper-tools/core";

interface DrilldownBody {
    seedPapers: Paper[];
    depth?: number;
    maxPerLevel?: number;
    enrich?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as DrilldownBody;
        const { seedPapers, depth = 1, maxPerLevel = 10, enrich = false } = body;

        if (!seedPapers || seedPapers.length === 0) {
            return NextResponse.json(
                { error: "seedPapers array is required and must not be empty" },
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
