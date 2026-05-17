import { searchByKeyword } from "@paper-tools/drilldown";
import { type NextRequest, NextResponse } from "next/server";
import {
	getSearchParams,
	parseNumericParam,
	parseStringParam,
} from "@/lib/api/request";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
	const searchParams = getSearchParams(request);
	const q = parseStringParam(searchParams, "q");
	const maxResults = parseNumericParam(searchParams, "maxResults", 30, 1, 100);

	if (!q) {
		return NextResponse.json(
			{ error: "q parameter is required" },
			{ status: 400 },
		);
	}

	try {
		const papers = await searchByKeyword(q, maxResults);
		return NextResponse.json({ papers, total: papers.length });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json(
			{ error: `Search backend failed: ${message}` },
			{ status: 502 },
		);
	}
}
