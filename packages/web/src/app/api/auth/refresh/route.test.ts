// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, USER_INFO_COOKIE } from "@/lib/auth-cookies";

// Instead of mocking the whole auth module, we'll spy on the getters to simulate incoming cookies
// and allow setAuthCookies to operate normally on the NextResponse object.
import * as auth from "@/lib/auth";

const { POST } = await import("./route");

describe("/api/auth/refresh POST", () => {
    let mockFetch: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("NOTION_OAUTH_CLIENT_ID", "test-client-id");
        vi.stubEnv("NOTION_OAUTH_CLIENT_SECRET", "test-client-secret");
        vi.stubEnv("COOKIE_SECRET", "test-secret");

        mockFetch = vi.fn();
        vi.stubGlobal("fetch", mockFetch);

        vi.spyOn(auth, "getRefreshToken").mockReturnValue("old-refresh-token");
        vi.spyOn(auth, "getUserInfo").mockReturnValue(null);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("should return 500 if OAuth config is missing", async () => {
        vi.unstubAllEnvs();
        vi.stubEnv("NOTION_OAUTH_CLIENT_ID", "");
        vi.stubEnv("NOTION_OAUTH_CLIENT_SECRET", "");

        const req = new NextRequest("http://localhost/api/auth/refresh", { method: "POST" });
        const res = await POST(req);

        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe("OAuth config is missing");
    });

    it("should return 401 if refresh token is not found in cookies", async () => {
        vi.spyOn(auth, "getRefreshToken").mockReturnValue(null);

        const req = new NextRequest("http://localhost/api/auth/refresh", { method: "POST" });
        const res = await POST(req);

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe("refresh_token not found");
    });

    it("should return 401 if Notion API request fails", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 400,
            json: async () => ({ error: "invalid_grant" }),
        });

        const req = new NextRequest("http://localhost/api/auth/refresh", { method: "POST" });
        const res = await POST(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("invalid_grant");
    });

    it("should return 502 if Notion response is missing refresh_token", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ access_token: "new-access-token" }), // Missing refresh_token
        });

        const req = new NextRequest("http://localhost/api/auth/refresh", { method: "POST" });
        const res = await POST(req);

        expect(res.status).toBe(502);
        const data = await res.json();
        expect(data.error).toBe("refresh_token missing in response");
    });

    it("should return 200, call fetch correctly, and set cookies on success", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                access_token: "new-access-token",
                refresh_token: "new-refresh-token",
                workspace_name: "Test Workspace",
            }),
        });

        const req = new NextRequest("http://localhost/api/auth/refresh", { method: "POST" });
        const res = await POST(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);

        // Assert fetch was called correctly
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe("https://api.notion.com/v1/oauth/token");
        expect(options.method).toBe("POST");
        const basic = Buffer.from("test-client-id:test-client-secret").toString("base64");
        expect(options.headers).toMatchObject({
            "Content-Type": "application/json",
            "Notion-Version": "2025-09-03",
            "Authorization": `Basic ${basic}`
        });
        expect(JSON.parse(options.body)).toEqual({
            grant_type: "refresh_token",
            refresh_token: "old-refresh-token"
        });

        // Assert cookies were set properly
        expect(res.cookies.get(ACCESS_TOKEN_COOKIE)).toBeDefined();
        expect(res.cookies.get(REFRESH_TOKEN_COOKIE)).toBeDefined();
        expect(res.cookies.get(USER_INFO_COOKIE)).toBeDefined();
    });

    it("should return 401 if fetch throws an error", async () => {
        mockFetch.mockRejectedValue(new Error("Network failure"));

        const req = new NextRequest("http://localhost/api/auth/refresh", { method: "POST" });
        const res = await POST(req);

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe("Network failure");
    });
});
