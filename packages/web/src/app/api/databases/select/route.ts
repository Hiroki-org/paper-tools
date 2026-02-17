import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getNotionClient, setDatabaseCookie } from "@/lib/auth";

type SelectBody = {
    databaseId?: string;
};

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

        let selectedDataSourceId: string | null = null;
        let properties: Record<string, { type?: string }> | null = null;

        try {
            const dataSource = await notion.dataSources.retrieve({ data_source_id: databaseId });
            if (dataSource.object === "data_source") {
                selectedDataSourceId = dataSource.id;
                properties = (dataSource as any).properties as Record<string, { type?: string }>;
            }
        } catch {
            const database = await notion.databases.retrieve({ database_id: databaseId });
            if (database.object !== "database") {
                return NextResponse.json({ error: "Database not found" }, { status: 404 });
            }
            const firstDataSourceId = (database as any).data_sources?.[0]?.id as string | undefined;
            if (!firstDataSourceId) {
                return NextResponse.json({ error: "No data source found in selected database" }, { status: 400 });
            }
            const dataSource = await notion.dataSources.retrieve({ data_source_id: firstDataSourceId });
            if (dataSource.object !== "data_source") {
                return NextResponse.json({ error: "Data source not found" }, { status: 404 });
            }
            selectedDataSourceId = dataSource.id;
            properties = (dataSource as any).properties as Record<string, { type?: string }>;
        }

        const warnings = validateDatabaseProperties(properties ?? {});

        const response = NextResponse.json({ success: true, warnings });
        setDatabaseCookie(response, selectedDataSourceId ?? databaseId, request);
        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to select database";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
