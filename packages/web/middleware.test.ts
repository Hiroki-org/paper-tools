import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, DATABASE_ID_COOKIE } from "@/lib/auth-cookies";
import { middleware } from "./middleware";

function makeAccessTokenCookie() {
    const payload = Buffer.from(JSON.stringify({ token: "access-token" })).toString("base64url");
    return `${payload}.signature`;
}

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
    const cookieHeader = Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");

    return new NextRequest(`http://localhost${pathname}`, {
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
}

describe("middleware", () => {
    it.each(["/api/search", "/api/graph", "/api/recommend", "/api/resolve"])(
        "requires authentication for %s",
        (pathname) => {
            const response = middleware(makeRequest(pathname));

            expect(response.status).toBe(401);
        },
    );

    it.each(["/api/search", "/api/graph", "/api/recommend", "/api/resolve"])(
        "allows authenticated database-optional API path without a selected database: %s",
        (pathname) => {
            const response = middleware(
                makeRequest(pathname, {
                    [ACCESS_TOKEN_COOKIE]: makeAccessTokenCookie(),
                }),
            );

            expect(response.headers.get("x-middleware-next")).toBe("1");
        },
    );

    it("still requires a selected database for database-backed API routes", async () => {
        const response = middleware(
            makeRequest("/api/archive", {
                [ACCESS_TOKEN_COOKIE]: makeAccessTokenCookie(),
            }),
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "Database is not selected",
        });
    });

    it("allows database-backed API routes when a database is selected", () => {
        const response = middleware(
            makeRequest("/api/archive", {
                [ACCESS_TOKEN_COOKIE]: makeAccessTokenCookie(),
                [DATABASE_ID_COOKIE]: "database-id",
            }),
        );

        expect(response.headers.get("x-middleware-next")).toBe("1");
    });
});
