import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

type DbItem = {
    id: string;
    title: string;
    icon: string | null;
    description: string;
};

export async function GET(request: NextRequest) {
    const accessToken = getAccessToken(request.cookies);
    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // v5 API does not support listing all user databases
        // Users should configure database ID directly or via environment
        const databases: DbItem[] = [];
        return NextResponse.json({ databases });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch databases";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
