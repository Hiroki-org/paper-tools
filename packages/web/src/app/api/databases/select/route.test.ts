import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    getAccessToken: vi.fn(),
    getNotionClient: vi.fn(),
    setDatabaseCookie: vi.fn(),
}));

vi.mock("@/lib/notion-data-source", () => ({
    resolveNotionDataSource: vi.fn(),
}));

const auth = await import("@/lib/auth");
const notionDataSource = await import("@/lib/notion-data-source");
const { POST } = await import("./route");

function makeRequest(body: any) {
    return new NextRequest("http://localhost/api/databases/select", {
        method: "POST",
        headers: {
            cookie: "access_token=dummy_token",
            "content-type": "application/json",
        },
        body: JSON.stringify(body),
    });
}

describe("/api/databases/select POST", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("Unauthorized 401 when access token is missing", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce(null);

        const res = await POST(makeRequest({ databaseId: "test_db" }));
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("Returns 400 if databaseId is not a string", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("valid_token");

        const res = await POST(makeRequest({ databaseId: 123 }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("databaseId must be a string");
    });

    it("Returns 400 if databaseId is missing", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("valid_token");

        const res = await POST(makeRequest({}));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("databaseId must be a string");
    });

    it("Returns 400 if databaseId is empty or whitespace", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("valid_token");

        const res = await POST(makeRequest({ databaseId: "   " }));
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("databaseId is required");
    });

    it("Successfully selects a database", async () => {
        vi.mocked(auth.getAccessToken).mockReturnValueOnce("valid_token");
        vi.mocked(auth.getNotionClient).mockReturnValueOnce({} as any);

        vi.mocked(notionDataSource.resolveNotionDataSource).mockResolvedValueOnce({
            id: "db1",
            properties: {
                title: { type: "title" },
                doi: { type: "rich_text" }
            }
        } as any);

        const res = await POST(makeRequest({ databaseId: " db1 " }));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.warnings).toEqual([]);
        expect(auth.setDatabaseCookie).toHaveBeenCalled();
    });
});
