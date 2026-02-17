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
        const database = await notion.databases.retrieve({ database_id: databaseId });
        if (database.object !== "database") {
            return NextResponse.json({ error: "Database not found" }, { status: 404 });
        }

        const warnings = validateDatabaseProperties((database as any).properties as Record<string, { type?: string }>);

        const response = NextResponse.json({ success: true, warnings });
        setDatabaseCookie(response, databaseId, request);
        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to select database";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
