import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, DATABASE_ID_COOKIE } from "@/lib/auth-cookies";

function isPublicPath(pathname: string) {
    return pathname === "/privacy" || pathname === "/terms";
}

function decodeBase64Url(input: string) {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    return atob(normalized + padding);
}

function hasValidAccessTokenShape(rawCookieValue?: string) {
    if (!rawCookieValue) return false;
    const [payload, signature] = rawCookieValue.split(".");
    if (!payload || !signature) return false;
    try {
        const parsed = JSON.parse(decodeBase64Url(payload)) as { token?: unknown };
        return typeof parsed.token === "string" && parsed.token.length > 0;
    } catch {
        return false;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.startsWith("/api/auth")
    ) {
        return NextResponse.next();
    }

    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    const accessTokenRaw = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const databaseId = request.cookies.get(DATABASE_ID_COOKIE)?.value;
    const hasAccessToken = hasValidAccessTokenShape(accessTokenRaw);

    // Redirect authenticated users away from /login
    if (pathname === "/login") {
        if (hasAccessToken) {
            if (databaseId) {
                return NextResponse.redirect(new URL("/", request.url));
            }
            return NextResponse.redirect(new URL("/setup", request.url));
        }
        return NextResponse.next();
    }

    // Require authentication for all other routes
    if (!hasAccessToken) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!databaseId) {
        if (pathname === "/setup" || pathname.startsWith("/api/databases")) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/setup", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
