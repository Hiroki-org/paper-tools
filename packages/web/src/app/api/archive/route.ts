import { NextRequest, NextResponse } from "next/server";
import type { S2Paper } from "@paper-tools/core";
import { getAccessToken, getNotionClient, getSelectedDatabaseId, getUserInfo } from "@/lib/auth";

type NotionProperty = {
    type?: string;
    title?: Array<{ plain_text?: string }>;
    rich_text?: Array<{ plain_text?: string }>;
    url?: string | null;
};

type NotionDataSource = {
    object: "data_source";
    id: string;
    properties: Record<string, NotionProperty>;
    title?: Array<{ plain_text?: string }>;
};

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
    const dataSourceId = getSelectedDatabaseId(request.cookies);
    if (!accessToken) {
        return { ok: false as const, status: 401, error: "Not authenticated" };
    }
    if (!dataSourceId) {
        return { ok: false as const, status: 400, error: "Database is not selected" };
    }
    return { ok: true as const, accessToken, dataSourceId };
}

function getStatusCodeFromError(error: unknown): number | null {
    if (!(error instanceof Error)) {
        return null;
    }

    const match = error.message.match(/\b(\d{3})\b/);
    if (!match?.[1]) {
        return null;
    }

    const status = Number(match[1]);
    return Number.isInteger(status) ? status : null;
}

function isNotionDataSource(value: unknown): value is NotionDataSource {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    if (candidate.object !== "data_source" || typeof candidate.id !== "string") {
        return false;
    }

    return typeof candidate.properties === "object" && candidate.properties !== null;
}

function getFirstDataSourceIdFromDatabase(value: unknown): string | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    const candidate = value as Record<string, unknown>;
    if (candidate.object !== "database") {
        return null;
    }

    const dataSources = candidate.data_sources;
    if (!Array.isArray(dataSources)) {
        return null;
    }

    const first = dataSources[0];
    if (typeof first !== "object" || first === null) {
        return null;
    }

    const id = (first as Record<string, unknown>).id;
    return typeof id === "string" ? id : null;
}

async function resolveDataSource(
    notion: NotionClient,
    dataSourceOrDatabaseId: string,
): Promise<NotionDataSource> {
    try {
        const response = await notion.dataSources.retrieve({ data_source_id: dataSourceOrDatabaseId });
        if (isNotionDataSource(response)) {
            return response;
        }

        throw new Error("Retrieved object is not a data source");
    } catch (error) {
        const status = getStatusCodeFromError(error);
        if (status !== null && status !== 400 && status !== 404) {
            throw error;
        }
    }

    const databaseRes = await notion.databases.retrieve({ database_id: dataSourceOrDatabaseId });
    const firstDataSourceId = getFirstDataSourceIdFromDatabase(databaseRes);
    if (!firstDataSourceId) {
        throw new Error("No data source found in database");
    }

    const fallbackResponse = await notion.dataSources.retrieve({ data_source_id: firstDataSourceId });
    if (!isNotionDataSource(fallbackResponse)) {
        throw new Error("Retrieved fallback object is not a data source");
    }

    return fallbackResponse;
}

export async function GET(request: NextRequest) {
    const auth = parseAuth(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const notion = getNotionClient(auth.accessToken);
        const dataSource = await resolveDataSource(notion, auth.dataSourceId);
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
        const dataSource = await resolveDataSource(notion, auth.dataSourceId);
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
