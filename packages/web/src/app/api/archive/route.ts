import { NextRequest, NextResponse } from "next/server";
import type { S2Paper } from "@paper-tools/core";
import { getAccessToken, getNotionClient, getSelectedDatabaseId, getUserInfo } from "@/lib/auth";

type NotionProperty = {
    type?: string;
    title?: Array<{ plain_text?: string }>;
    rich_text?: Array<{ plain_text?: string }>;
    url?: string | null;
};

function getPlainText(items: Array<{ plain_text?: string }> | undefined) {
    return (items ?? []).map((item) => item.plain_text ?? "").join("").trim();
}

function findTitleProperty(properties: Record<string, NotionProperty>) {
    const entry = Object.entries(properties).find(([, prop]) => prop.type === "title");
    return entry?.[0] ?? "Name";
}

function findPropertyByKeyword(properties: Record<string, NotionProperty>, keyword: string) {
    const lower = keyword.toLowerCase();
    const entry = Object.entries(properties).find(([name]) => name.toLowerCase() === lower)
        ?? Object.entries(properties).find(([name]) => name.toLowerCase().includes(lower));
    return entry?.[0] ?? null;
}

function mapPageRecord(page: {
    id: string;
    properties: Record<string, NotionProperty>;
}) {
    const props = page.properties;
    const titleKey = findTitleProperty(props);
    const doiKey = findPropertyByKeyword(props, "doi");
    const s2Key = findPropertyByKeyword(props, "semantic scholar") ?? findPropertyByKeyword(props, "s2");

    const titleProp = props[titleKey];
    const doiProp = doiKey ? props[doiKey] : undefined;
    const s2Prop = s2Key ? props[s2Key] : undefined;

    return {
        pageId: page.id,
        title: getPlainText(titleProp?.title) || "(untitled)",
        doi: getPlainText(doiProp?.rich_text) || doiProp?.url || undefined,
        semanticScholarId: getPlainText(s2Prop?.rich_text) || undefined,
    };
}

function parseAuth(request: NextRequest) {
    const accessToken = getAccessToken(request.cookies);
    const databaseId = getSelectedDatabaseId(request.cookies);
    if (!accessToken) {
        return { ok: false as const, status: 401, error: "Not authenticated" };
    }
    if (!databaseId) {
        return { ok: false as const, status: 400, error: "Database is not selected" };
    }
    return { ok: true as const, accessToken, databaseId };
}

export async function GET(request: NextRequest) {
    const auth = parseAuth(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const notion = getNotionClient(auth.accessToken);
        const databaseRes = await notion.databases.retrieve({ database_id: auth.databaseId });

        if (databaseRes.object !== "database") {
            return NextResponse.json({ error: "Database not found" }, { status: 404 });
        }

        // Fetch pages from the database using search API (v5 does not have databases.query)
        const recordsRes = await notion.search({
            
            sort: { direction: "descending", timestamp: "last_edited_time" } as any,
        });

        const records = recordsRes.results
            .filter((r) => r.object === "page")
            .map((page) => mapPageRecord(page as { id: string; properties: Record<string, NotionProperty> }));

        const userInfo = getUserInfo(request.cookies);
        const databaseTitle = "title" in databaseRes
            ? (databaseRes.title as Array<{ plain_text?: string }>)
            : [];
        const databaseName = getPlainText(databaseTitle) || "(untitled database)";

        return NextResponse.json({
            records,
            total: records.length,
            database: {
                databaseId: databaseRes.id,
                databaseName,
                workspaceName: userInfo?.workspaceName ?? "Notion Workspace",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = parseAuth(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const body = (await request.json()) as { paper: S2Paper };
        const { paper } = body;

        if (!paper) {
            return NextResponse.json({ error: "paper is required" }, { status: 400 });
        }

        const notion = getNotionClient(auth.accessToken);
        const database = await notion.databases.retrieve({ database_id: auth.databaseId });
        if (database.object !== "database") {
            return NextResponse.json({ error: "Database not found" }, { status: 404 });
        }

        const props = (database as any).properties as Record<string, NotionProperty>;
        const titleKey = findTitleProperty(props);
        const doiKey = findPropertyByKeyword(props, "doi");
        const s2Key = findPropertyByKeyword(props, "semantic scholar") ?? findPropertyByKeyword(props, "s2");

        const properties: Record<string, unknown> = {
            [titleKey]: {
                title: [{ text: { content: paper.title ?? "Untitled" } }],
            },
        };

        const doi = paper.externalIds?.DOI?.trim();
        if (doiKey && doi) {
            const doiType = props[doiKey]?.type;
            if (doiType === "url") {
                properties[doiKey] = { url: `https://doi.org/${doi}` };
            } else {
                properties[doiKey] = { rich_text: [{ text: { content: doi } }] };
            }
        }

        if (s2Key && paper.paperId) {
            properties[s2Key] = {
                rich_text: [{ text: { content: paper.paperId } }],
            };
        }

        await notion.pages.create({
            parent: { database_id: auth.databaseId },
            properties: properties as any,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
