import { NextRequest, NextResponse } from "next/server";
import { buildNotionRedirectUri, createStateToken, setOauthStateCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "NOTION_OAUTH_CLIENT_ID is not set" }, { status: 500 });
  }

  const state = createStateToken();
  const redirectUri = buildNotionRedirectUri(request);

  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  setOauthStateCookie(response, state, request);
  return response;
}
