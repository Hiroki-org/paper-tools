import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getNotionClient } from "@/lib/auth";

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
        const notion = getNotionClient(accessToken);
        const databases: DbItem[] = [];

        let startCursor: string | undefined;
        do {
            const response = await notion.search({
                filter: { property: "object", value: "data_source" },
                page_size: 100,
                start_cursor: startCursor,
            });

            for (const result of response.results) {
                if (result.object !== "data_source") continue;
                const ds = result as any;

                const title = (ds.title ?? [])
                    .map((item: { plain_text?: string }) => item.plain_text ?? "")
                    .join("")
                    .trim();

                const description = (ds.description ?? [])
                    .map((item: { plain_text?: string }) => item.plain_text ?? "")
                    .join("")
                    .trim();

                const icon = ds.icon?.type === "emoji"
                    ? ds.icon.emoji
                    : ds.icon?.type === "external"
                        ? ds.icon.external?.url ?? null
                        : ds.icon?.type === "file"
                            ? ds.icon.file?.url ?? null
                            : null;

                databases.push({
                    id: ds.id,
                    title: title || "(untitled database)",
                    icon,
                    description,
                });
            }

            startCursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
        } while (startCursor);

        return NextResponse.json({ databases });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch databases";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
