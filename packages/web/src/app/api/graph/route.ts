import { NextRequest, NextResponse } from "next/server";
import { buildCitationGraph } from "@paper-tools/visualizer";
import type { Direction } from "@paper-tools/visualizer";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const doi = searchParams.get("doi");
    const depth = Number(searchParams.get("depth") ?? "1");
    const direction = (searchParams.get("direction") ?? "both") as Direction;

    if (!doi) {
        return NextResponse.json({ error: "doi parameter is required" }, { status: 400 });
    }

    try {
        const graph = await buildCitationGraph(doi, depth, direction);
        return NextResponse.json({ graph });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
