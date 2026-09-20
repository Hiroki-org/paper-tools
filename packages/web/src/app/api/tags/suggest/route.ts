import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
	getAccessToken,
	getNotionClient,
	getSelectedDatabaseId,
} from "@/lib/auth";
import { resolveNotionDataSource } from "@/lib/notion-data-source";
import { CACHE_TTL_MS, cache, setCacheWithPruning } from "./cache";

export const runtime = "nodejs";

type NotionProperty = {
	type?: string;
	multi_select?: Array<{ name?: string }>;
};

const MAX_QUERY_PAGES = 8;

const _globalEnv = globalThis as unknown as {
	__tagSuggestInFlight?: Map<string, Promise<string[]>>;
};
const inFlightRequests =
	_globalEnv.__tagSuggestInFlight ?? new Map<string, Promise<string[]>>();
if (!_globalEnv.__tagSuggestInFlight) {
	_globalEnv.__tagSuggestInFlight = inFlightRequests;
}

async function fetchTagsForDataSource(
	notion: ReturnType<typeof getNotionClient>,
	dataSource: { id: string },
	tagKeys: string[],
): Promise<string[]> {
	const uniqueTags = new Map<string, string>();
	let startCursor: string | undefined;
	let pageCount = 0;

	do {
		const response = await notion.dataSources.query({
			data_source_id: dataSource.id,
			page_size: 100,
			start_cursor: startCursor,
		});
		pageCount += 1;

		for (const record of response.results) {
			if (!isPageRecord(record)) continue;
			for (const key of tagKeys) {
				const items = record.properties[key]?.multi_select;
				if (!items) continue;
				for (const item of items) {
					const normalized = normalizeTag(item.name ?? "");
					if (!normalized) continue;
					const dedupeKey = normalized.toLowerCase();
					if (!uniqueTags.has(dedupeKey)) {
						uniqueTags.set(dedupeKey, normalized);
					}
				}
			}
		}

		startCursor = response.has_more
			? (response.next_cursor ?? undefined)
			: undefined;
		if (pageCount >= MAX_QUERY_PAGES) {
			startCursor = undefined;
		}
	} while (startCursor);

	return Array.from(uniqueTags.values());
}

function clampLimit(limit: number) {
	if (!Number.isFinite(limit)) return 10;
	return Math.max(1, Math.min(20, limit));
}

function normalizeTag(value: string) {
	return value.trim();
}

function findTagPropertyKeys(properties: Record<string, NotionProperty>) {
	const entries = Object.entries(properties);
	const multiSelectEntries = entries.filter(
		([, prop]) => prop.type === "multi_select",
	);
	const preferred = multiSelectEntries.filter(([name]) =>
		/tag|タグ|label/i.test(name),
	);
	return (preferred.length > 0 ? preferred : multiSelectEntries).map(
		([name]) => name,
	);
}

function isPageRecord(
	value: unknown,
): value is { properties: Record<string, NotionProperty> } {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		record.object === "page" &&
		typeof record.properties === "object" &&
		record.properties !== null
	);
}

export async function GET(request: Request) {
	const accessToken = getAccessToken(await cookies());
	const dataSourceId = getSelectedDatabaseId(await cookies());
	if (!accessToken) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}
	if (!dataSourceId) {
		return NextResponse.json(
			{ error: "Database is not selected" },
			{ status: 400 },
		);
	}

	const { searchParams } = new URL(request.url);
	const q = searchParams.get("q")?.trim() ?? "";
	const limit = clampLimit(Number(searchParams.get("limit") ?? "10"));

	if (q.length < 2) {
		return NextResponse.json({ suggestions: [] as string[] });
	}

	try {
		const notion = getNotionClient(accessToken);
		const dataSource = await resolveNotionDataSource<NotionProperty>(
			notion,
			dataSourceId,
		);
		const tagKeys = findTagPropertyKeys(dataSource.properties);
		if (tagKeys.length === 0) {
			return NextResponse.json({ suggestions: [] as string[] });
		}

		const cacheKey = crypto
			.createHash("sha256")
			.update(accessToken + dataSource.id)
			.digest("hex");
		let allTags: string[];

		const cached = cache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
			allTags = cached.data;
		} else if (inFlightRequests.has(cacheKey)) {
			const inFlight = inFlightRequests.get(cacheKey);
			if (!inFlight) throw new Error("In flight missing");
			allTags = await inFlight;
		} else {
			const promise = fetchTagsForDataSource(notion, dataSource, tagKeys)
				.then((tags) => {
					setCacheWithPruning(
						cacheKey,
						{ data: tags, timestamp: Date.now() },
						cache,
					);
					inFlightRequests.delete(cacheKey);
					return tags;
				})
				.catch((err) => {
					inFlightRequests.delete(cacheKey);
					throw err;
				});
			inFlightRequests.set(cacheKey, promise);
			allTags = await promise;
		}

		const normalizedQuery = q.toLowerCase();
		const suggestions = allTags
			.filter((tag) => tag.toLowerCase().includes(normalizedQuery))
			.sort((a, b) => {
				const aStarts = a.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
				const bStarts = b.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
				if (aStarts !== bStarts) return aStarts - bStarts;
				return a.localeCompare(b, "ja");
			})
			.slice(0, limit);

		return NextResponse.json({ suggestions });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
