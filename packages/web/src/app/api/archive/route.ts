import { NextRequest, NextResponse } from "next/server";
import { queryPapers, createPaperPage, getDatabase, getDatabaseInfo } from "@paper-tools/recommender";
import type { S2Paper } from "@paper-tools/core";

function validateNotionEnv(): { valid: boolean; databaseId?: string; error?: string } {
    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
        return {
            valid: false,
            error: "Notion APIキーまたはデータベースIDが設定されていません。",
        };
    }
    return { valid: true, databaseId: notionDatabaseId };
}

export async function GET() {
    const envCheck = validateNotionEnv();
    if (!envCheck.valid || !envCheck.databaseId) {
        return NextResponse.json({ error: envCheck.error }, { status: 500 });
    }

    try {
        const database = await getDatabaseInfo(envCheck.databaseId);
        const records = await queryPapers(envCheck.databaseId);
        return NextResponse.json({ records, total: records.length, database });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const envCheck = validateNotionEnv();
    if (!envCheck.valid || !envCheck.databaseId) {
        return NextResponse.json({ error: envCheck.error }, { status: 500 });
    }

    try {
        const body = (await request.json()) as { paper: S2Paper };
        const { paper } = body;

        if (!paper) {
            return NextResponse.json({ error: "paper is required" }, { status: 400 });
        }

        const validation = await getDatabase(envCheck.databaseId);
        await createPaperPage(envCheck.databaseId, paper, undefined, validation);
        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
