import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { ACCESS_TOKEN_COOKIE, DATABASE_ID_COOKIE } from "@/lib/auth-cookies";
import { middleware } from "./middleware";

function encodePayload(payload: unknown) {
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function createRequest(
    pathname: string,
    cookies: Record<string, string> = {},
): NextRequest {
    return {
        nextUrl: { pathname },
        url: `https://example.test${pathname}`,
        cookies: {
            get: (name: string) => {
                const value = cookies[name];
                return value === undefined ? undefined : { value };
            },
        },
    } as unknown as NextRequest;
}

describe("middleware", () => {
    it("treats a null token payload as unauthenticated", () => {
        const response = middleware(
            createRequest("/archive", {
                [ACCESS_TOKEN_COOKIE]: `${encodePayload(null)}.signature`,
                [DATABASE_ID_COOKIE]: "database-id",
            }),
        );

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("https://example.test/login");
    });

    it("redirects authenticated users with a selected database away from login", () => {
        const response = middleware(
            createRequest("/login", {
                [ACCESS_TOKEN_COOKIE]: `${encodePayload({ token: "token" })}.signature`,
                [DATABASE_ID_COOKIE]: "database-id",
            }),
        );

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("https://example.test/");
    });
});
