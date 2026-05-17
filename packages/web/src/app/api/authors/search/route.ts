import { searchAuthors } from "@paper-tools/core";
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
	const limit = parseNumericParam(searchParams, "limit", 10, 1, 20);

	if (!q) {
		return NextResponse.json(
			{ error: "q parameter is required" },
			{ status: 400 },
		);
	}

	try {
		const res = await searchAuthors(q, { limit });
		return NextResponse.json({
			total: res.total,
			candidates: (res.data ?? []).map((c) => ({
				authorId: c.authorId,
				name: c.name,
				affiliations: c.affiliations ?? [],
				paperCount: c.paperCount ?? 0,
				citationCount: c.citationCount ?? 0,
				hIndex: c.hIndex ?? 0,
			})),
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
