import { NextRequest, NextResponse } from "next/server";
import type { S2Paper } from "@paper-tools/core";
import { getAccessToken, getNotionClient, getSelectedDatabaseId, getUserInfo } from "@/lib/auth";
import { resolveNotionDataSource, type NotionDataSource } from "@/lib/notion-data-source";

type NotionProperty = {
    type?: string;
    title?: Array<{ plain_text?: string }>;
    rich_text?: Array<{ plain_text?: string }>;
    url?: string | null;
};

type ArchiveNotionDataSource = NotionDataSource<NotionProperty>;

type NotionClient = ReturnType<typeof getNotionClient>;
type NotionPageCreateProperties = Parameters<NotionClient["pages"]["create"]>[0]["properties"];

function getPlainText(items: Array<{ plain_text?: string }> | undefined) {
    return (items ?? []).map((item) => item.plain_text ?? "").join("").trim();
}

function findTitleProperty(properties: Record<string, NotionProperty>) {
    const entry = Object.entries(properties).find(([, prop]) => prop.type === "title");
    return entry?.[0] ?? "Name";
}

function findPropertyByKeyword(properties: Record<string, NotionProperty>, keyword: string) {
    const lower = keyword.toLowerCase();
    let partialMatch: string | null = null;

    for (const name of Object.keys(properties)) {
        const nameLower = name.toLowerCase();
        if (nameLower === lower) {
            return name;
        }
        if (!partialMatch && nameLower.includes(lower)) {
            partialMatch = name;
        }
    }

    return partialMatch;
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
    const dataSourceId = getSelectedDatabaseId(request.cookies);
    if (!accessToken) {
        return { ok: false as const, status: 401, error: "Not authenticated" };
    }
    if (!dataSourceId) {
        return { ok: false as const, status: 400, error: "Database is not selected" };
    }
    return { ok: true as const, accessToken, dataSourceId };
}

export async function GET(request: NextRequest) {
    const auth = parseAuth(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const notion = getNotionClient(auth.accessToken);
        const dataSource: ArchiveNotionDataSource = await resolveNotionDataSource<NotionProperty>(notion, auth.dataSourceId);
        const recordsRes = await notion.dataSources.query({
            data_source_id: dataSource.id,
            page_size: 100,
        });

        const records = recordsRes.results
            .filter((r) => r.object === "page")
            .map((page) => mapPageRecord(page as { id: string; properties: Record<string, NotionProperty> }));

        const userInfo = getUserInfo(request.cookies);
        const databaseTitle = dataSource.title ?? [];
        const databaseName = getPlainText(databaseTitle) || "(untitled database)";

        return NextResponse.json({
            records,
            total: records.length,
            database: {
                databaseId: dataSource.id,
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
        const dataSource: ArchiveNotionDataSource = await resolveNotionDataSource<NotionProperty>(notion, auth.dataSourceId);
        const props = dataSource.properties;
        const titleKey = findTitleProperty(props);
        const doiKey = findPropertyByKeyword(props, "doi");
        const s2Key = findPropertyByKeyword(props, "semantic scholar") ?? findPropertyByKeyword(props, "s2");

        const properties: NotionPageCreateProperties = {
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
            parent: { data_source_id: dataSource.id },
            properties,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
