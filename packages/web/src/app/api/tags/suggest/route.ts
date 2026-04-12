import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getNotionClient, getSelectedDatabaseId } from "@/lib/auth";
import { resolveNotionDataSource, type NotionDataSource } from "@/lib/notion-data-source";

export const runtime = "nodejs";

type NotionProperty = {
    type?: string;
    multi_select?: Array<{ name?: string }>;
};

type TagsNotionDataSource = NotionDataSource<NotionProperty>;
const MAX_QUERY_PAGES = 8;

function clampLimit(limit: number) {
    if (!Number.isFinite(limit)) return 10;
    return Math.max(1, Math.min(20, limit));
}

function normalizeTag(value: string) {
    return value.trim();
}

function findTagPropertyKeys(properties: Record<string, NotionProperty>) {
    const entries = Object.entries(properties);
    const multiSelectEntries = entries.filter(([, prop]) => prop.type === "multi_select");
    const preferred = multiSelectEntries.filter(([name]) => /tag|タグ|label/i.test(name));
    return (preferred.length > 0 ? preferred : multiSelectEntries).map(([name]) => name);
}

function isPageRecord(value: unknown): value is { properties: Record<string, NotionProperty> } {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const record = value as Record<string, unknown>;
    return record.object === "page"
        && typeof record.properties === "object"
        && record.properties !== null;
}

export async function GET(request: NextRequest) {
    const accessToken = getAccessToken(request.cookies);
    const dataSourceId = getSelectedDatabaseId(request.cookies);
    if (!accessToken) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!dataSourceId) {
        return NextResponse.json({ error: "Database is not selected" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = clampLimit(Number(searchParams.get("limit") ?? "10"));

    if (q.length < 2) {
        return NextResponse.json({ suggestions: [] as string[] });
    }

    try {
        const notion = getNotionClient(accessToken);
        const dataSource: TagsNotionDataSource = await resolveNotionDataSource<NotionProperty>(notion, dataSourceId);
        const tagKeys = findTagPropertyKeys(dataSource.properties);
        if (tagKeys.length === 0) {
            return NextResponse.json({ suggestions: [] as string[] });
        }

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
                    const items = record.properties[key]?.multi_select ?? [];
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

            startCursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
            if (pageCount >= MAX_QUERY_PAGES) {
                startCursor = undefined;
            }
        } while (startCursor);

        const normalizedQuery = q.toLowerCase();
        const suggestions = Array.from(uniqueTags.values())
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
