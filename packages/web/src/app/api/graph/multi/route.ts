import type { Direction } from "@paper-tools/visualizer";
import {
	buildCitationGraph,
	mapConcurrent,
	mergeGraphs,
} from "@paper-tools/visualizer";
import { type NextRequest, NextResponse } from "next/server";

interface MultiGraphBody {
	dois: string[];
	depth?: number;
	direction?: Direction;
}

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as MultiGraphBody;
		const { dois, depth = 1, direction = "both" } = body;

		if (!dois || dois.length === 0) {
			return NextResponse.json(
				{ error: "dois array is required and must not be empty" },
				{ status: 400 },
			);
		}

		const graphs = await mapConcurrent(
			dois,
			(doi) => buildCitationGraph(doi, depth, direction),
			10,
		);
		const merged = mergeGraphs(...graphs);
		return NextResponse.json({ graph: merged });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
