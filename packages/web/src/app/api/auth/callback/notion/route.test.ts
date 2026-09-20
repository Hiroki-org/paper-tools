// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const token = vi.fn();

vi.mock("@notionhq/client", () => ({
    Client: vi.fn(() => ({
        oauth: { token },
    })),
}));

vi.mock("@/lib/auth", () => ({
    OAUTH_STATE_COOKIE: "oauth_state",
    buildNotionRedirectUri: vi.fn(() => "http://localhost/api/auth/callback/notion"),
    setAuthCookies: vi.fn(),
}));

const { GET } = await import("./route");

describe("Notion OAuth callback", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("NOTION_OAUTH_CLIENT_ID", "client-id");
        vi.stubEnv("NOTION_OAUTH_CLIENT_SECRET", "client-secret");
    });

    it("redirects with a sanitized log when token exchange fails", async () => {
        const error = new Error("client_secret=do-not-log");
        token.mockRejectedValueOnce(error);
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const request = new NextRequest(
            "http://localhost/api/auth/callback/notion?code=code&state=state",
        );
        request.cookies.set("oauth_state", "state");

        const response = await GET(request);

        expect(response.headers.get("location")).toBe(
            "http://localhost/login?error=oauth_callback_failed",
        );
        expect(consoleError).toHaveBeenCalledWith("[notion-oauth] callback failed", {
            name: expect.any(String),
        });
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain("do-not-log");
        consoleError.mockRestore();
    });
});
