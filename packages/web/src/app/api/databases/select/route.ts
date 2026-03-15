import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getNotionClient, setDatabaseCookie } from "@/lib/auth";

type SelectBody = {
    databaseId?: string;
};

interface NotionDataSource {
    object: string;
    id: string;
    properties: Record<string, { type?: string }>;
}

type NotionClient = ReturnType<typeof getNotionClient>;

function validateDatabaseProperties(properties: Record<string, { type?: string }>) {
    const entries = Object.entries(properties);
    const hasTitle = entries.some(([, v]) => v?.type === "title");
    const hasDoi = entries.some(([key, v]) => {
        const lower = key.toLowerCase();
        if (lower === "doi") return true;
        return lower.includes("doi") && (v?.type === "rich_text" || v?.type === "url" || v?.type === "title");
    });

    const warnings: string[] = [];
    if (!hasTitle) warnings.push("必須プロパティ: タイトル(title) が見つかりません");
    if (!hasDoi) warnings.push("推奨プロパティ: DOI が見つかりません");
    return warnings;
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
    return candidate.object === "data_source"
        && typeof candidate.id === "string"
        && typeof candidate.properties === "object"
        && candidate.properties !== null;
}

function getFirstDataSourceIdFromDatabase(value: unknown): string | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }
    const candidate = value as Record<string, unknown>;
    if (candidate.object !== "database" || !Array.isArray(candidate.data_sources)) {
        return null;
    }
    const first = candidate.data_sources[0];
    if (typeof first !== "object" || first === null) {
        return null;
    }
    const id = (first as Record<string, unknown>).id;
    return typeof id === "string" ? id : null;
}

async function resolveDataSource(notion: NotionClient, databaseId: string): Promise<NotionDataSource> {
    try {
        const dataSource = await notion.dataSources.retrieve({ data_source_id: databaseId });
        if (isNotionDataSource(dataSource)) {
            return dataSource;
        }
    } catch (error) {
        const status = getStatusCodeFromError(error);
        if (status !== null && status !== 400 && status !== 404) {
            throw error;
        }
    }

    const database = await notion.databases.retrieve({ database_id: databaseId });
    const firstDataSourceId = getFirstDataSourceIdFromDatabase(database);
    if (!firstDataSourceId) {
        throw new Error("No data source found in selected database");
    }

    const dataSource = await notion.dataSources.retrieve({ data_source_id: firstDataSourceId });
    if (!isNotionDataSource(dataSource)) {
        throw new Error("Data source not found");
    }
    return dataSource;
}

export async function POST(request: NextRequest) {
    const accessToken = getAccessToken(request.cookies);
    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json()) as SelectBody;
        const databaseId = body.databaseId?.trim();
        if (!databaseId) {
            return NextResponse.json({ error: "databaseId is required" }, { status: 400 });
        }

        const notion = getNotionClient(accessToken);
        const dataSource = await resolveDataSource(notion, databaseId);
        const warnings = validateDatabaseProperties(dataSource.properties);

        const response = NextResponse.json({ success: true, warnings });
        setDatabaseCookie(response, dataSource.id, request);
        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to select database";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
