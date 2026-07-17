import { describe, it, expect, vi, beforeEach } from "vitest";
import { middleware } from "./middleware";
import { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, DATABASE_ID_COOKIE } from "@/lib/auth-cookies";

// Mock next/server
const mockNext = vi.fn();
const mockRedirect = vi.fn();
const mockJson = vi.fn();

vi.mock("next/server", () => ({
    NextResponse: {
        next: (...args: any[]) => mockNext(...args),
        redirect: (...args: any[]) => mockRedirect(...args),
        json: (...args: any[]) => mockJson(...args),
    },
}));

function createMockRequest(url: string, cookies: Record<string, string> = {}) {
    const nextUrl = new URL(url, "http://localhost:3000");
    return {
        nextUrl,
        url: nextUrl.toString(),
        cookies: {
            get: vi.fn((key: string) => (cookies[key] !== undefined ? { value: cookies[key] } : undefined)),
        },
    } as unknown as NextRequest;
}

function createValidToken() {
    // Has a valid shape: payload.signature
    // Payload needs to be valid base64url JSON with a non-empty string "token" field.
    const payload = btoa(JSON.stringify({ token: "hello" }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    return `${payload}.signature`;
}

function createInvalidToken() {
    return "invalid.token";
}

describe("middleware", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockNext.mockReturnValue("next-response");
        mockRedirect.mockReturnValue("redirect-response");
        mockJson.mockReturnValue("json-response");
    });

    it("should pass through public paths like /_next", () => {
        const req = createMockRequest("http://localhost:3000/_next/static/css");
        const res = middleware(req);
        expect(res).toBe("next-response");
        expect(mockNext).toHaveBeenCalled();
    });

    it("should pass through /favicon.ico", () => {
        const req = createMockRequest("http://localhost:3000/favicon.ico");
        const res = middleware(req);
        expect(res).toBe("next-response");
        expect(mockNext).toHaveBeenCalled();
    });

    it("should pass through /api/auth", () => {
        const req = createMockRequest("http://localhost:3000/api/auth/callback");
        const res = middleware(req);
        expect(res).toBe("next-response");
        expect(mockNext).toHaveBeenCalled();
    });

    it("should pass through specific public API routes", () => {
        const routes = ["/api/search", "/api/graph", "/api/recommend", "/api/resolve"];
        for (const route of routes) {
            vi.resetAllMocks();
            mockNext.mockReturnValue("next-response");
            const req = createMockRequest(`http://localhost:3000${route}`);
            const res = middleware(req);
            expect(res).toBe("next-response");
            expect(mockNext).toHaveBeenCalled();
        }
    });

    it("should pass through public paths /privacy and /terms", () => {
        const routes = ["/privacy", "/terms"];
        for (const route of routes) {
            vi.resetAllMocks();
            mockNext.mockReturnValue("next-response");
            const req = createMockRequest(`http://localhost:3000${route}`);
            const res = middleware(req);
            expect(res).toBe("next-response");
            expect(mockNext).toHaveBeenCalled();
        }
    });

    describe("when unauthenticated", () => {
        it("should allow access to /login", () => {
            const req = createMockRequest("http://localhost:3000/login");
            const res = middleware(req);
            expect(res).toBe("next-response");
            expect(mockNext).toHaveBeenCalled();
        });

        it("should return 401 for other /api routes", () => {
            const req = createMockRequest("http://localhost:3000/api/protected");
            const res = middleware(req);
            expect(res).toBe("json-response");
            expect(mockJson).toHaveBeenCalledWith({ error: "Unauthorized" }, { status: 401 });
        });

        it("should redirect to /login for other UI routes", () => {
            const req = createMockRequest("http://localhost:3000/dashboard");
            const res = middleware(req);
            expect(res).toBe("redirect-response");
            expect(mockRedirect).toHaveBeenCalledWith(new URL("http://localhost:3000/login"));
        });

        it("should treat invalid token as unauthenticated", () => {
            const req = createMockRequest("http://localhost:3000/dashboard", {
                [ACCESS_TOKEN_COOKIE]: createInvalidToken(),
            });
            const res = middleware(req);
            expect(res).toBe("redirect-response");
            expect(mockRedirect).toHaveBeenCalledWith(new URL("http://localhost:3000/login"));
        });

        it("should treat missing rawCookieValue as unauthenticated", () => {
            const req = createMockRequest("http://localhost:3000/dashboard", {
                [ACCESS_TOKEN_COOKIE]: "",
            });
            const res = middleware(req);
            expect(res).toBe("redirect-response");
            expect(mockRedirect).toHaveBeenCalledWith(new URL("http://localhost:3000/login"));
        });

        it("should treat invalid token parts as unauthenticated", () => {
            const req = createMockRequest("http://localhost:3000/dashboard", {
                [ACCESS_TOKEN_COOKIE]: "justpayload",
            });
            const res = middleware(req);
            expect(res).toBe("redirect-response");
            expect(mockRedirect).toHaveBeenCalledWith(new URL("http://localhost:3000/login"));
        });
    });

    describe("when authenticated", () => {
        describe("without database selected", () => {
            it("should redirect away from /login to /setup", () => {
                const req = createMockRequest("http://localhost:3000/login", {
                    [ACCESS_TOKEN_COOKIE]: createValidToken(),
                });
                const res = middleware(req);
                expect(res).toBe("redirect-response");
                expect(mockRedirect).toHaveBeenCalledWith(new URL("http://localhost:3000/setup"));
            });

            it("should allow access to /setup", () => {
                const req = createMockRequest("http://localhost:3000/setup", {
                    [ACCESS_TOKEN_COOKIE]: createValidToken(),
                });
                const res = middleware(req);
                expect(res).toBe("next-response");
                expect(mockNext).toHaveBeenCalled();
            });

            it("should allow access to /api/databases", () => {
                const req = createMockRequest("http://localhost:3000/api/databases", {
                    [ACCESS_TOKEN_COOKIE]: createValidToken(),
                });
                const res = middleware(req);
                expect(res).toBe("next-response");
                expect(mockNext).toHaveBeenCalled();
            });

            it("should return 400 for other API routes", () => {
                const req = createMockRequest("http://localhost:3000/api/protected", {
                    [ACCESS_TOKEN_COOKIE]: createValidToken(),
                });
                const res = middleware(req);
                expect(res).toBe("json-response");
                expect(mockJson).toHaveBeenCalledWith({ error: "Database is not selected" }, { status: 400 });
            });

            it("should redirect to /setup for other UI routes", () => {
                const req = createMockRequest("http://localhost:3000/dashboard", {
                    [ACCESS_TOKEN_COOKIE]: createValidToken(),
                });
                const res = middleware(req);
                expect(res).toBe("redirect-response");
                expect(mockRedirect).toHaveBeenCalledWith(new URL("http://localhost:3000/setup"));
            });
        });

        describe("with database selected", () => {
            it("should redirect away from /login to /", () => {
                const req = createMockRequest("http://localhost:3000/login", {
                    [ACCESS_TOKEN_COOKIE]: createValidToken(),
                    [DATABASE_ID_COOKIE]: "some-db-id",
                });
                const res = middleware(req);
                expect(res).toBe("redirect-response");
                expect(mockRedirect).toHaveBeenCalledWith(new URL("http://localhost:3000/"));
            });

            it("should allow access to protected UI routes", () => {
                const req = createMockRequest("http://localhost:3000/dashboard", {
                    [ACCESS_TOKEN_COOKIE]: createValidToken(),
                    [DATABASE_ID_COOKIE]: "some-db-id",
                });
                const res = middleware(req);
                expect(res).toBe("next-response");
                expect(mockNext).toHaveBeenCalled();
            });

            it("should allow access to protected API routes", () => {
                const req = createMockRequest("http://localhost:3000/api/protected", {
                    [ACCESS_TOKEN_COOKIE]: createValidToken(),
                    [DATABASE_ID_COOKIE]: "some-db-id",
                });
                const res = middleware(req);
                expect(res).toBe("next-response");
                expect(mockNext).toHaveBeenCalled();
            });
        });
    });
});
