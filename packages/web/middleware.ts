import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "pt_notion_access";
const DATABASE_ID_COOKIE = "pt_notion_db";

function isPublicPath(pathname: string) {
    return pathname === "/login" || pathname === "/privacy" || pathname === "/terms";
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

    if (!accessToken) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!databaseId) {
        if (pathname === "/setup" || pathname.startsWith("/api/databases")) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/setup", request.url));
    }

    if (pathname === "/login") {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
