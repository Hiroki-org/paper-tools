import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getNotionClient } from "@/lib/auth";

type DbItem = {
  id: string;
  title: string;
  icon: string | null;
  description: string;
};

function plainTextFromRichText(items: Array<{ plain_text?: string }> | undefined) {
  if (!items?.length) return "";
  return items.map((item) => item.plain_text ?? "").join("").trim();
}

export async function GET(request: NextRequest) {
  const accessToken = getAccessToken(request.cookies);
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notion = getNotionClient(accessToken);
    const response = await notion.search({
      filter: { property: "object", value: "database" },
    });

    const databases: DbItem[] = response.results
      .filter((r) => r.object === "database")
      .map((database) => {
        const db = database as any;
        const title = plainTextFromRichText((db.title ?? []) as Array<{ plain_text?: string }>);
        const icon =
          db.icon?.type === "emoji"
            ? db.icon.emoji
            : db.icon?.type === "external"
              ? db.icon.external.url
              : null;
        const description = plainTextFromRichText((db.description ?? []) as Array<{ plain_text?: string }>);

        return {
          id: db.id,
          title: title || "(untitled database)",
          icon,
          description,
        };
      });

    return NextResponse.json({ databases });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch databases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
