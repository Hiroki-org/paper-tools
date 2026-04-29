import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "./middleware";
import { ACCESS_TOKEN_COOKIE, DATABASE_ID_COOKIE } from "@/lib/auth-cookies";

// Need to mock NextResponse methods we're inspecting
vi.mock("next/server", async (importOriginal) => {
    const original = await importOriginal<typeof import("next/server")>();

    return {
        ...original,
        NextResponse: {
            next: vi.fn().mockReturnValue({ type: "next" }),
            redirect: vi.fn().mockImplementation((url) => ({ type: "redirect", url: url.toString() })),
            json: vi.fn().mockImplementation((body, init) => ({ type: "json", body, init })),
        }
    };
});

// Helper to create a NextRequest
function createRequest(path: string, cookies: Record<string, string> = {}) {
    const url = `http://localhost${path}`;
    const req = new NextRequest(url);

    // Mock cookies
    Object.entries(cookies).forEach(([key, value]) => {
        req.cookies.set(key, value);
    });

    return req;
}

// Helper to create a valid-looking access token
function createValidToken() {
    const payload = btoa(JSON.stringify({ token: "valid-token-data" })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return `${payload}.signature`;
}

describe("middleware", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Pass-through routes", () => {
        it("allows _next, favicon, and api/auth paths", () => {
            const paths = ["/_next/static/css/app.css", "/favicon.ico", "/api/auth/login"];

            paths.forEach(path => {
                const req = createRequest(path);
                const res = middleware(req);
                expect(res).toEqual({ type: "next" });
                expect(NextResponse.next).toHaveBeenCalled();
            });
        });

        it("allows specific api routes without auth", () => {
            const paths = ["/api/search", "/api/graph", "/api/recommend", "/api/resolve"];

            paths.forEach(path => {
                const req = createRequest(path);
                const res = middleware(req);
                expect(res).toEqual({ type: "next" });
                expect(NextResponse.next).toHaveBeenCalled();
            });
        });

        it("allows public paths without auth", () => {
            const paths = ["/privacy", "/terms"];

            paths.forEach(path => {
                const req = createRequest(path);
                const res = middleware(req);
                expect(res).toEqual({ type: "next" });
                expect(NextResponse.next).toHaveBeenCalled();
            });
        });
    });

    describe("Authentication - Token parsing", () => {
        it("rejects invalid token shapes", () => {
            // Missing signature
            const req1 = createRequest("/protected", { [ACCESS_TOKEN_COOKIE]: "payload-only" });
            const res1 = middleware(req1);
            expect(res1).toEqual({ type: "redirect", url: "http://localhost/login" });

            // Invalid base64
            const req2 = createRequest("/protected", { [ACCESS_TOKEN_COOKIE]: "invalid-base64.signature" });
            const res2 = middleware(req2);
            expect(res2).toEqual({ type: "redirect", url: "http://localhost/login" });

            // Missing token in payload
            const emptyPayload = btoa(JSON.stringify({})).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            const req3 = createRequest("/protected", { [ACCESS_TOKEN_COOKIE]: `${emptyPayload}.signature` });
            const res3 = middleware(req3);
            expect(res3).toEqual({ type: "redirect", url: "http://localhost/login" });
        });

        it("accepts valid token shapes", () => {
            const req = createRequest("/protected", {
                [ACCESS_TOKEN_COOKIE]: createValidToken(),
                [DATABASE_ID_COOKIE]: "db-123"
            });
            const res = middleware(req);
            expect(res).toEqual({ type: "next" });
        });
    });

    describe("/login route handling", () => {
        it("allows unauthenticated users to access /login", () => {
            const req = createRequest("/login");
            const res = middleware(req);
            expect(res).toEqual({ type: "next" });
        });

        it("redirects authenticated users WITH db to /", () => {
            const req = createRequest("/login", {
                [ACCESS_TOKEN_COOKIE]: createValidToken(),
                [DATABASE_ID_COOKIE]: "db-123"
            });
            const res = middleware(req);
            expect(res).toEqual({ type: "redirect", url: "http://localhost/" });
        });

        it("redirects authenticated users WITHOUT db to /setup", () => {
            const req = createRequest("/login", {
                [ACCESS_TOKEN_COOKIE]: createValidToken()
            });
            const res = middleware(req);
            expect(res).toEqual({ type: "redirect", url: "http://localhost/setup" });
        });
    });

    describe("Protected routes handling", () => {
        it("redirects unauthenticated users to /login for page routes", () => {
            const req = createRequest("/dashboard");
            const res = middleware(req);
            expect(res).toEqual({ type: "redirect", url: "http://localhost/login" });
        });

        it("returns 401 JSON for unauthenticated api routes", () => {
            const req = createRequest("/api/protected-data");
            const res = middleware(req);
            expect(res).toEqual({
                type: "json",
                body: { error: "Unauthorized" },
                init: { status: 401 }
            });
        });

        it("allows authenticated users WITHOUT db to access /setup", () => {
            const req = createRequest("/setup", {
                [ACCESS_TOKEN_COOKIE]: createValidToken()
            });
            const res = middleware(req);
            expect(res).toEqual({ type: "next" });
        });

        it("allows authenticated users WITHOUT db to access /api/databases", () => {
            const req = createRequest("/api/databases/list", {
                [ACCESS_TOKEN_COOKIE]: createValidToken()
            });
            const res = middleware(req);
            expect(res).toEqual({ type: "next" });
        });

        it("redirects authenticated users WITHOUT db to /setup for other page routes", () => {
            const req = createRequest("/dashboard", {
                [ACCESS_TOKEN_COOKIE]: createValidToken()
            });
            const res = middleware(req);
            expect(res).toEqual({ type: "redirect", url: "http://localhost/setup" });
        });

        it("returns 400 JSON for authenticated users WITHOUT db for other api routes", () => {
            const req = createRequest("/api/protected-data", {
                [ACCESS_TOKEN_COOKIE]: createValidToken()
            });
            const res = middleware(req);
            expect(res).toEqual({
                type: "json",
                body: { error: "Database is not selected" },
                init: { status: 400 }
            });
        });

        it("allows authenticated users WITH db to access protected routes", () => {
            const req = createRequest("/dashboard", {
                [ACCESS_TOKEN_COOKIE]: createValidToken(),
                [DATABASE_ID_COOKIE]: "db-123"
            });
            const res = middleware(req);
            expect(res).toEqual({ type: "next" });
        });
    });
});
