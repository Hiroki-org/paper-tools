import { Client } from "@notionhq/client";
import { NextRequest, NextResponse } from "next/server";
import {
    OAUTH_STATE_COOKIE,
    buildNotionRedirectUri,
    setAuthCookies,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
    const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
    const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return NextResponse.redirect(new URL("/login?error=missing_oauth_config", request.url));
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const stateInCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

    if (!code || !state || !stateInCookie || state !== stateInCookie) {
        return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
    }

    try {
        const notion = new Client();
        const tokenResponse = await notion.oauth.token({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: buildNotionRedirectUri(request),
        });

        const owner = tokenResponse.owner;
        const userName = owner.type === "user" ? (owner.user as any)?.name : undefined;

        const response = NextResponse.redirect(new URL("/setup", request.url));
        const refreshToken = (tokenResponse as any).refresh_token as string | undefined;
        if (!refreshToken) {
            return NextResponse.redirect(new URL("/login?error=missing_refresh_token", request.url));
        }

        setAuthCookies(response, {
            accessToken: tokenResponse.access_token,
            refreshToken,
            userInfo: {
                name: userName,
                workspaceName: tokenResponse.workspace_name ?? undefined,
                workspaceIcon: tokenResponse.workspace_icon,
            },
            request,
        });
        response.cookies.set(OAUTH_STATE_COOKIE, "", {
            path: "/",
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });
        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : "OAuth callback failed";
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));
    }
}
