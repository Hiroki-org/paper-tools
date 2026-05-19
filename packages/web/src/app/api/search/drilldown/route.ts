import { NextRequest, NextResponse } from "next/server";
import { drilldown } from "@paper-tools/drilldown";
import type { DrilldownBody } from "./route.types";

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        const body = payload as unknown as DrilldownBody;
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

        const results = await drilldown(seedPapers, depth, maxPerLevel, enrich);
        return NextResponse.json({ results });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
