import { NextRequest, NextResponse } from "next/server";
import { getRefreshToken, getUserInfo, setAuthCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "OAuth config is missing" }, { status: 500 });
  }

  const refreshToken = getRefreshToken(request.cookies);
  if (!refreshToken) {
    return NextResponse.json({ error: "refresh_token not found" }, { status: 401 });
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Notion-Version": "2025-09-03",
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const tokenResponse = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      workspace_name?: string | null;
      workspace_icon?: string | null;
      error?: string;
    };
    if (!tokenRes.ok || !tokenResponse.access_token) {
      return NextResponse.json(
        { error: tokenResponse.error ?? "Refresh failed" },
        { status: tokenRes.status || 401 },
      );
    }
    const nextRefreshToken = (tokenResponse as any).refresh_token as string | undefined;
    if (!nextRefreshToken) {
      return NextResponse.json({ error: "refresh_token missing in response" }, { status: 502 });
    }

    const userInfo = getUserInfo(request.cookies) ?? {
      workspaceName: tokenResponse.workspace_name ?? undefined,
      workspaceIcon: tokenResponse.workspace_icon,
    };

    const response = NextResponse.json({ success: true });
    setAuthCookies(response, {
      accessToken: tokenResponse.access_token,
      refreshToken: nextRefreshToken,
      userInfo,
      request,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
