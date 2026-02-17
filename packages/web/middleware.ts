import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, DATABASE_ID_COOKIE } from "@/lib/auth";

function isPublicPath(pathname: string) {
    return pathname === "/privacy" || pathname === "/terms";
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

    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const databaseId = request.cookies.get(DATABASE_ID_COOKIE)?.value;

    // Redirect authenticated users away from /login
    if (pathname === "/login") {
        if (accessToken) {
            if (databaseId) {
                return NextResponse.redirect(new URL("/", request.url));
            }
            return NextResponse.redirect(new URL("/setup", request.url));
        }
        return NextResponse.next();
    }

    // Require authentication for all other routes
    if (!accessToken) {
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
