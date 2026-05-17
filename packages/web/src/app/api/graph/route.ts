import type { Direction } from "@paper-tools/visualizer";
import { buildCitationGraph } from "@paper-tools/visualizer";
import { type NextRequest, NextResponse } from "next/server";
import { getSearchParams, parseLimit } from "@/app/api/utils/params";

export async function GET(request: NextRequest) {
	const searchParams = getSearchParams(request);
	const doi = searchParams.get("doi");
	const depth = parseLimit(searchParams, "depth", 1, 1, 10);
	const direction = (searchParams.get("direction") ?? "both") as Direction;

	if (!doi) {
		return NextResponse.json(
			{ error: "doi parameter is required" },
			{ status: 400 },
		);
	}

	try {
		const graph = await buildCitationGraph(doi, depth, direction);
		return NextResponse.json({ graph });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
