import { NextRequest, NextResponse } from "next/server";
import { queryPapers, createPaperPage, getDatabase } from "@paper-tools/recommender";
import type { S2Paper } from "@paper-tools/core";

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export async function GET() {
  try {
    const records = await queryPapers(DATABASE_ID);
    return NextResponse.json({ records, total: records.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { paper: S2Paper };
    const { paper } = body;

    if (!paper) {
      return NextResponse.json({ error: "paper is required" }, { status: 400 });
    }

    const validation = await getDatabase(DATABASE_ID);
    await createPaperPage(DATABASE_ID, paper, undefined, validation);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
